import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { createHmac, timingSafeEqual } from "crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

admin.initializeApp();

// Nome do app usado nos textos de pagamento.
const APP_NAME = "ProConecta";

// Token do Mercado Pago (Secret Manager em produção; functions/.secret.local no emulador).
const MP_SECRET = "MERCADOPAGO_ACCESS_TOKEN";

// No emulador e sem token do Mercado Pago, a compra de moedas é creditada
// direto (modo demonstração). Em produção isso nunca acontece.
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

/**
 * Lote de escritas que se divide sozinho em commits de até 450 operações
 * (o limite do Firestore é 500 por lote). Usado pelas funções agendadas,
 * que percorrem coleções inteiras.
 */
class ChunkedBatch {
  private ops: Array<{ ref: admin.firestore.DocumentReference; data: admin.firestore.UpdateData<admin.firestore.DocumentData> }> = [];
  constructor(private db: admin.firestore.Firestore) {}
  update(ref: admin.firestore.DocumentReference, data: admin.firestore.UpdateData<admin.firestore.DocumentData>) {
    this.ops.push({ ref, data });
  }
  async commit() {
    for (let i = 0; i < this.ops.length; i += 450) {
      const batch = this.db.batch();
      this.ops.slice(i, i + 450).forEach((op) => batch.update(op.ref, op.data));
      await batch.commit();
    }
  }
}

/**
 * Credita as moedas de um pacote na carteira do usuário, de forma idempotente
 * (o id da transação impede crédito em dobro) e cria a notificação.
 */
const creditCoinPackage = async (params: {
  userId: string;
  productId: string;
  transactionId: string;
  paymentId: string | number;
  paidAmount?: number;
}) => {
  const { userId, productId, transactionId, paymentId, paidAmount } = params;
  const db = admin.firestore();
  const transactionRef = db.collection("transactions").doc(transactionId);
  const userRef = db.doc(`users/${userId}`);

  const packageSnap = await db.collection("coin_packages").where("productId", "==", productId).limit(1).get();
  if (packageSnap.empty) {
    throw new Error(`Pacote de moedas com ID ${productId} não encontrado.`);
  }
  const packageData = packageSnap.docs[0].data();
  if (paidAmount !== undefined && paidAmount + 0.001 < Number(packageData.priceBRL)) {
    throw new Error(`Valor pago (${paidAmount}) menor que o preço do pacote ${productId}.`);
  }
  const coinsToAdd = packageData.amountCoins + (packageData.bonusCoins || 0);

  await db.runTransaction(async (transaction) => {
    const existingTransaction = await transaction.get(transactionRef);
    if (existingTransaction.exists) {
      logger.warn(`Transação ${transactionId} já foi processada.`);
      return;
    }
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error(`Usuário com ID ${userId} não encontrado.`);
    }

    const currentBalance = userDoc.data()?.walletBalance || 0;
    const newBalance = currentBalance + coinsToAdd;
    transaction.update(userRef, { walletBalance: newBalance });

    const notificationRef = userRef.collection("notifications").doc();
    transaction.set(notificationRef, {
      type: "carteira",
      title: "Recarga concluída com sucesso!",
      body: `Adicionamos ${coinsToAdd} moedas à sua carteira. Seu novo saldo é de ${newBalance}.`,
      link: "/wallet",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(transactionRef, {
      userId,
      productId,
      paymentId,
      coinsAdded: coinsToAdd,
      processedAt: FieldValue.serverTimestamp(),
      status: "completed",
    });
    logger.log(`Adicionadas ${coinsToAdd} moedas para o usuário ${userId}. Novo saldo: ${newBalance}`);
  });
  return coinsToAdd;
};

/**
 * Confere a assinatura do webhook do Mercado Pago (cabeçalho x-signature),
 * quando MERCADOPAGO_WEBHOOK_SECRET estiver configurado.
 * Manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com HMAC-SHA256.
 */
const isValidMercadoPagoSignature = (
  secret: string,
  signatureHeader: string | undefined,
  requestId: string | undefined,
  dataId: string,
): boolean => {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
};

// ===================================================================
// --- FUNÇÃO PARA ENVIAR NOTIFICAÇÕES PUSH ---
// ===================================================================
export const sendPushOnNewNotification = onDocumentCreated("users/{userId}/notifications/{notificationId}", async (event) => {
  const notificationData = event.data?.data();
  const userId = event.params.userId;

  if (!notificationData) {
    logger.log("Dados da notificação não encontrados.");
    return;
  }

  // Os push tokens ficam em users/{uid}/private/account (só o dono lê).
  // O campo antigo users/{uid}.pushTokens ainda é lido como alternativa.
  const db = admin.firestore();
  const [privateDoc, userDoc] = await Promise.all([
    db.doc(`users/${userId}/private/account`).get(),
    db.doc(`users/${userId}`).get(),
  ]);
  const pushTokens: string[] = privateDoc.data()?.pushTokens || userDoc.data()?.pushTokens || [];
  const userData = { pushTokens };

  if (userData.pushTokens.length === 0) {
    logger.log(`Usuário ${userId} não possui push tokens. Nenhuma notificação será enviada.`);
    return;
  }

  // Montar a mensagem da notificação
  const pushMessage = {
    to: userData.pushTokens,
    sound: 'default',
    title: notificationData.title,
    body: notificationData.body,
    data: { link: notificationData.link || '/' }, // Envia o link para ser usado no app
  };

  logger.log("Enviando notificação push para:", userData.pushTokens);

  // Enviar a notificação para os servidores da Expo
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pushMessage),
    });

    const responseBody = await response.json();
    logger.log("Resposta da API da Expo:", responseBody);

  } catch (error) {
    logger.error("Erro ao enviar notificação push:", error);
  }
});

// ===================================================================
// --- FUNÇÃO AUXILIAR DE NOTIFICAÇÕES ---
// ===================================================================
/**
 * Cria um documento de notificação para um usuário específico.
 * @param {string} userId - O UID do usuário que receberá a notificação.
 * @param {object} notificationData - O objeto com os dados da notificação.
 */
const createNotification = async (userId: string, notificationData: object) => {
  const db = admin.firestore();
  const notificationRef = db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .doc();

  await notificationRef.set({
    ...notificationData,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  logger.log(`Notificação criada para o usuário ${userId}`);
};

export const onUserPremiumStatusChange = onDocumentUpdated(
  "users/{userId}",
  (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.log("Dados de antes ou depois não encontrados no evento.");
      return null;
    }

    if (beforeData.isPremium === false && afterData.isPremium === true) {
      logger.log(
        `Usuário ${event.params.userId} tornou-se Premium. Adicionando campo 'random'.`
      );
      return event.data?.after.ref.set(
        {
          random: Math.random(),
        },
        { merge: true }
      );
    }

    logger.log(
      `Atualização no usuário ${event.params.userId} não alterou o status para Premium.`
    );
    return null;
  }
);

export const logProfileView = onCall(async (request) => {
  const viewerId = request.auth?.uid;
  const professionalId = request.data.professionalId;

  logger.log(`[DEBUG] Função logProfileView iniciada. Viewer: ${viewerId}, Professional: ${professionalId}`);

  if (!viewerId) {
    logger.error("[DEBUG] Falha: Usuário não autenticado.");
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  if (!professionalId) {
    logger.error("[DEBUG] Falha: ID do profissional não fornecido.");
    throw new HttpsError("invalid-argument", "ID do profissional não fornecido.");
  }
  if (viewerId === professionalId) {
    logger.log("[DEBUG] Visualização do próprio perfil. Ignorando.");
    return { success: true, message: "Não é possível registrar visualização no próprio perfil." };
  }

  const viewsRef = admin.firestore()
    .collection("users").doc(professionalId)
    .collection("profileViews");

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const recentViewsQuery = await viewsRef
      .where("viewerId", "==", viewerId)
      .where("timestamp", ">", twentyFourHoursAgo)
      .limit(1)
      .get();

    if (!recentViewsQuery.empty) {
      logger.log(`[DEBUG] Visualização repetida encontrada. Ignorando.`);
      return { success: true, message: "Visualização já registrada recentemente." };
    }

    await viewsRef.add({
      viewerId: viewerId,
      timestamp: FieldValue.serverTimestamp(),
    });

    logger.log(`[DEBUG] Sucesso: Nova visualização registrada no Firestore.`);
    return { success: true, message: "Visualização registrada." };
  } catch (error) {
    logger.error("[DEBUG] Erro de Firestore ao tentar registrar visualização:", error);
    throw new HttpsError("internal", "Erro ao salvar a visualização.");
  }
});

export const aggregateProfileViews = onSchedule({
  schedule: "every day 03:00",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  logger.log("[DEBUG] Função AGENDADA aggregateProfileViews iniciada.");
  const db = admin.firestore();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const professionalsQuery = db.collection("users").where("profileType", "in", ["professional", "professional-premium"]);
  const professionalsSnapshot = await professionalsQuery.get();

  if (professionalsSnapshot.empty) {
    logger.log("[DEBUG] Nenhum profissional encontrado para agregar visualizações.");
    return;
  }

  logger.log(`[DEBUG] Encontrados ${professionalsSnapshot.size} profissionais para processar.`);
  const batch = new ChunkedBatch(db);

  for (const professionalDoc of professionalsSnapshot.docs) {
    const viewsRef = professionalDoc.ref.collection("profileViews");
    const recentViewsQuery = viewsRef.where("timestamp", ">=", sevenDaysAgo);
    const recentViewsSnapshot = await recentViewsQuery.get();

    const totalViewCount = recentViewsSnapshot.size;
    logger.log(`[DEBUG] Profissional ${professionalDoc.id} tem ${totalViewCount} visualizações nos últimos 7 dias.`);
      const dailyViews: { [key: string]: number } = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split("T")[0];
        dailyViews[dateString] = 0;
      }

      recentViewsSnapshot.forEach((doc) => {
        const timestamp = doc.data().timestamp.toDate();
        const dateString = timestamp.toISOString().split("T")[0];
        if (dailyViews[dateString] !== undefined) {
          dailyViews[dateString]++;
        }
      });

      batch.update(professionalDoc.ref, {
        viewCountLast7Days: totalViewCount,
        dailyViews: dailyViews,
      });
    }

    await batch.commit();
  logger.log(`[DEBUG] Contagem de visualizações atualizada para ${professionalsSnapshot.size} profissionais.`);
});

export const deleteChatRoom = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar logado para executar esta ação."
    );
  }

  const userId = request.auth.uid;
  const { chatRoomId } = request.data;

  if (!chatRoomId) {
    throw new HttpsError("invalid-argument", "O ID da sala de chat não foi fornecido.");
  }

  const roomRef = admin.firestore().doc(`chat_rooms/${chatRoomId}`);

  try {
    const roomDoc = await roomRef.get();

    if (!roomDoc.exists) {
      logger.log(`Sala de chat ${chatRoomId} não encontrada. Nada a fazer.`);
      return { success: true, message: "Sala de chat não encontrada." };
    }

    const participants = roomDoc.data()?.participants;

    if (!participants || !participants.includes(userId)) {
      throw new HttpsError(
        "permission-denied",
        "Você não tem permissão para excluir esta conversa."
      );
    }

    logger.log(
      `Iniciando exclusão recursiva da sala de chat ${chatRoomId} por ${userId}.`
    );
    await admin.firestore().recursiveDelete(roomRef);

    return { success: true, message: "Conversa excluída com sucesso." };
  } catch (error) {
    logger.error(`Erro ao excluir a sala de chat ${chatRoomId}:`, error);
    throw new HttpsError("internal", "Ocorreu um erro ao excluir a conversa.");
  }
});

// ===================================================================
// --- FUNÇÃO applyToJob (com notificação) ---
// ===================================================================
export const applyToJob = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const { jobId, coverLetter } = request.data;
    if (typeof jobId !== "string" || !jobId) {
      throw new HttpsError("invalid-argument", "O ID da vaga é necessário.");
    }
    if (coverLetter !== undefined && (typeof coverLetter !== "string" || coverLetter.length > 2000)) {
      throw new HttpsError("invalid-argument", "Carta de apresentação inválida (máx. 2000 caracteres).");
    }
    const applicantId = request.auth.uid;
    const db = admin.firestore();

    const userRef = db.doc(`users/${applicantId}`);
    const jobRef = db.doc(`jobs/${jobId}`);
    const applicantRef = db.doc(`jobs/${jobId}/applicants/${applicantId}`);

    const configDoc = await db.collection("app_config").doc("costs").get();
    if (!configDoc.exists) {
      throw new HttpsError("internal", "Configuração de custos não encontrada.");
    }
    const costs = configDoc.data()!;

    try {
      const jobOwnerUid = await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const jobDoc = await transaction.get(jobRef);
        const applicantDoc = await transaction.get(applicantRef);

        if (!userDoc.exists) throw new HttpsError("not-found", "Usuário não encontrado.");
        if (!jobDoc.exists) throw new HttpsError("not-found", "Vaga não encontrada.");
        if (applicantDoc.exists) throw new HttpsError("already-exists", "Você já se candidatou a esta vaga.");

        const jobData = jobDoc.data()!;
        if (jobData.postedByUid === applicantId) {
          throw new HttpsError("failed-precondition", "Você não pode se candidatar à sua própria vaga.");
        }
        if (jobData.status !== "open") {
          throw new HttpsError("failed-precondition", "Esta vaga não está mais aceitando candidaturas.");
        }

        const userData = userDoc.data()!;
        if (userData.profileType !== "professional" && userData.profileType !== "professional-premium") {
          throw new HttpsError("permission-denied", "Apenas perfis profissionais podem se candidatar.");
        }

        let newBalance = userData.walletBalance || 0;
        const freeApplications = userData.dailyFreeApplications || { count: 0 };

        if (freeApplications.count > 0) {
          logger.log(`Usuário ${applicantId} usando uma candidatura gratuita. Restantes: ${freeApplications.count - 1}`);
          transaction.update(userRef, { "dailyFreeApplications.count": FieldValue.increment(-1) });
        } else {
          let applyCost = costs.applyToJobCost;
          if (userData.isPremium) {
            applyCost = applyCost * (1 - costs.premiumApplyDiscount);
          }
          if (newBalance < applyCost) {
            throw new HttpsError("failed-precondition", "Saldo insuficiente para se candidatar.");
          }
          newBalance -= applyCost;
          transaction.update(userRef, { walletBalance: newBalance });
        }

        transaction.update(userRef, { appliedJobs: FieldValue.arrayUnion(jobId) });

        transaction.set(applicantRef, {
          applicantName: userData.displayName,
          applicantPhotoURL: userData.photoURL || null,
          applicantHeadline: userData.profession || "Profissional",
          appliedAt: FieldValue.serverTimestamp(),
          coverLetter: coverLetter || "",
        });

        return jobData.postedByUid;
      });


      if (jobOwnerUid) {
        const applicantDoc = await userRef.get();
        const jobDoc = await jobRef.get();
        await createNotification(jobOwnerUid, {
          type: "candidatura",
          title: "Nova candidatura na sua vaga!",
          body: `O profissional "${applicantDoc.data()?.displayName}" se candidatou à sua vaga de "${jobDoc.data()?.title}".`,
          link: `/job-applicants/${jobId}`,
        });
      }

      logger.log(`Usuário ${applicantId} se candidatou à vaga ${jobId}.`);
      return { success: true, message: "Candidatura enviada com sucesso!" };
    } catch (error) {
      logger.error(`Erro na candidatura do usuário ${applicantId} para a vaga ${jobId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ocorreu um erro ao enviar sua candidatura.");
    }
  }
);

// ===================================================================
// --- WEBHOOK (com notificação de recarga) ---
// ===================================================================
export const paymentWebhook = onRequest(
  {
    secrets: [MP_SECRET],
  },
  async (request, response) => {
    const paymentNotification = request.body;
    logger.log("Recebida notificação do Mercado Pago:", paymentNotification);

    if (paymentNotification.data?.id === "123456") {
      logger.log("Recebida notificação de teste do simulador. Respondendo com sucesso.");
      response.status(200).send("Simulação de webhook recebida com sucesso.");
      return;
    }

    if (paymentNotification?.type !== "payment" || !paymentNotification.data?.id) {
      logger.log("Notificação inválida ou não é de pagamento. Ignorando.");
      response.status(200).send("Notificação ignorada.");
      return;
    }

    const paymentId = String(paymentNotification.data.id);

    // Assinatura do webhook (opcional, mas recomendada em produção).
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const ok = isValidMercadoPagoSignature(
        webhookSecret,
        request.get("x-signature"),
        request.get("x-request-id"),
        paymentId,
      );
      if (!ok) {
        logger.warn(`Assinatura inválida no webhook do pagamento ${paymentId}.`);
        response.status(401).send("Assinatura inválida.");
        return;
      }
    }

    try {
      const accessToken = process.env[MP_SECRET];
      if (!accessToken) {
        throw new Error("Access Token do Mercado Pago não configurado.");
      }
      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);

      // A fonte da verdade é a API do Mercado Pago, nunca o corpo do webhook.
      const paymentInfo = await payment.get({ id: paymentId });
      logger.log("Detalhes do pagamento obtidos:", { id: paymentInfo.id, status: paymentInfo.status });

      if (
        paymentInfo &&
        paymentInfo.status === "approved" &&
        paymentInfo.external_reference
      ) {
        const userId = paymentInfo.external_reference;
        const productId = paymentInfo.additional_info?.items?.[0]?.id;
        if (!userId || !productId) {
          throw new Error(
            `ID do usuário ou do produto não encontrado no pagamento. UserID: ${userId}, ProductID: ${productId}`
          );
        }
        await creditCoinPackage({
          userId,
          productId,
          transactionId: `mp-${paymentId}`,
          paymentId,
          paidAmount: paymentInfo.transaction_amount,
        });
      } else {
        logger.log(
          `Pagamento ${paymentId} não está aprovado ou não tem referência externa. Status: ${paymentInfo.status}`
        );
      }

      response.status(200).send("Notificação recebida com sucesso.");
    } catch (error) {
      logger.error(`Erro ao processar webhook para o pagamento ${paymentId}:`, error);
      response.status(500).send("Erro ao processar a notificação.");
    }
  }
);

// --- FIM DA NOVA FUNÇÃO WEBHOOK ---

// --- INÍCIO DAS FUNÇÕES DA CARTEIRA ---

export const createPaymentOrder = onCall({
  secrets: [MP_SECRET],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  // O frontend chama esta função enviando o packageId do produto.
  // busca os detalhes do pacote (preço, nome)
  const { packageId } = request.data;
  if (!packageId) {
    throw new HttpsError("invalid-argument", "O ID do pacote está ausente.");
  }

  const packageRef = admin.firestore().collection("coin_packages").where("productId", "==", packageId);
  const packageSnap = await packageRef.get();

  if (packageSnap.empty) {
    throw new HttpsError("not-found", "O pacote de moedas selecionado não existe.");
  }
  const packageData = packageSnap.docs[0].data();

  const accessToken = process.env[MP_SECRET];
  if (!accessToken) {
    // Modo demonstração: só no emulador local, credita o pacote sem cobrança.
    if (isEmulator) {
      const coinsAdded = await creditCoinPackage({
        userId: request.auth.uid,
        productId: packageData.productId,
        transactionId: `demo-${request.auth.uid}-${Date.now()}`,
        paymentId: "demo",
      });
      logger.log(`[demo] ${coinsAdded} moedas creditadas sem Mercado Pago para ${request.auth.uid}.`);
      return { success: true, demoMode: true, coinsAdded };
    }
    throw new HttpsError("failed-precondition", "Pagamentos não estão configurados neste ambiente.");
  }

  const client = new MercadoPagoConfig({ accessToken: accessToken, options: { timeout: 5000 } });

  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 30);

  const preferenceData = {
    items: [
      {
        id: packageData.productId,
        title: `${packageData.amountCoins} moedas`,
        description: `Pacote de ${packageData.amountCoins} moedas para o app ${APP_NAME}`,
        quantity: 1,
        unit_price: packageData.priceBRL,
        currency_id: "BRL",
      },
    ],
    payer: {
      email: request.auth.token.email,
    },
    back_urls: {
      success: process.env.PAYMENT_BACK_URL_SUCCESS || "https://example.com/success",
      failure: process.env.PAYMENT_BACK_URL_FAILURE || "https://example.com/failure",
      pending: process.env.PAYMENT_BACK_URL_PENDING || "https://example.com/pending",
    },
    external_reference: request.auth.uid,
    // URL pública da função paymentWebhook (opcional: também pode ser configurada no painel do Mercado Pago).
    ...(process.env.MERCADOPAGO_WEBHOOK_URL ? { notification_url: process.env.MERCADOPAGO_WEBHOOK_URL } : {}),

    // Adicionar a configuração de métodos de pagamento para garantir o PIX
    payment_methods: {
      excluded_payment_types: [
        { id: "ticket" }
      ],
      installments: 1, // PIX não suporta parcelamento, então é bom definir como 1
    },

    // Adicionar a data de expiração (essencial para o QR Code do PIX)
    // O formato deve ser ISO 8601 (ex: 2025-09-11T19:30:00.000Z)
    date_of_expiration: expirationDate.toISOString(),

  };

  try {
    logger.log("Criando preferência de pagamento com os dados:", JSON.stringify(preferenceData));
    const preference = new Preference(client);
    const result = await preference.create({ body: preferenceData });

    logger.log("Preferência criada com sucesso. ID:", result.id);
    // A função retorna o paymentUrl (init_point) para o frontend.
    return {
      success: true,
      preferenceId: result.id,
      paymentUrl: result.init_point,
    };
  } catch (error: any) {
    // Captura e log detalhado do erro da API do Mercado Pago
    logger.error("Erro detalhado ao criar preferência no Mercado Pago:", error.cause ?? error);

    // Extrai a mensagem de erro específica do Mercado Pago para enviar ao app
    const errorMessage = error.cause?.error?.message || "Não foi possível criar a ordem de pagamento.";

    throw new HttpsError("internal", errorMessage);
  }
});

// Debita moedas para comprar ou renovar a assinatura Premium.

export const purchaseFeatureWithCoins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const userId = request.auth.uid;
  const { featureId } = request.data;
  const PREMIUM_COST = 120; // Custo da assinatura

  if (featureId !== "become_premium") {
    throw new HttpsError("not-found", "Funcionalidade desconhecida.");
  }

  const userRef = admin.firestore().doc(`users/${userId}`);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Usuário não encontrado.");
      }

      const userData = userDoc.data()!;
      const currentBalance = userData.walletBalance || 0;

      if (currentBalance < PREMIUM_COST) {
        throw new HttpsError("failed-precondition", "Saldo insuficiente.");
      }

      const newBalance = currentBalance - PREMIUM_COST;

      // Lógica de data de expiração
      const now = new Date();
      const currentExpiration = userData.premiumExpiresAt?.toDate();
      // Se o usuário já é premium e está renovando, adiciona 30 dias à data de expiração atual.
      // Senão, adiciona 30 dias a partir da data atual.
      const newExpirationDate = (currentExpiration && currentExpiration > now)
        ? new Date(currentExpiration.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      transaction.update(userRef, {
        walletBalance: newBalance,
        isPremium: true,
        premiumExpiresAt: Timestamp.fromDate(newExpirationDate),
      });
    });

    logger.log(`Usuário ${userId} comprou/renovou a assinatura Premium.`);
    return { success: true };

  } catch (error) {
    logger.error(`Falha na compra para o usuário ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocorreu um erro ao processar sua compra.");
  }
});

// Roda todo dia para verificar e renovar ou expirar assinaturas Premium.

export const checkPremiumSubscriptions = onSchedule({
  schedule: "every day 01:00",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  logger.log("Iniciando verificação de assinaturas Premium...");
  const db = admin.firestore();
  const now = Timestamp.now();
  const PREMIUM_COST = 120;

  const expiredUsersQuery = db.collection("users")
    .where("isPremium", "==", true)
    .where("premiumExpiresAt", "<=", now);

  const snapshot = await expiredUsersQuery.get();
  if (snapshot.empty) {
    logger.log("Nenhuma assinatura expirada encontrada.");
    return;
  }

  const batch = new ChunkedBatch(db);

  snapshot.forEach(doc => {
    const user = doc.data();
    const userRef = doc.ref;

    // Verificação defensiva: usa '?? 0' para garantir que walletBalance seja um número,
    // mesmo que o campo não exista no documento (ele será tratado como 0).
    const currentBalance = user.walletBalance ?? 0;

    if (currentBalance >= PREMIUM_COST) {
      // Tenta renovar
      const newBalance = currentBalance - PREMIUM_COST;

      // Verificação defensiva: só tenta renovar se a data de expiração existir.
      if (user.premiumExpiresAt && typeof user.premiumExpiresAt.toDate === 'function') {
        const currentExpiration = user.premiumExpiresAt.toDate();
        const newExpirationDate = new Date(currentExpiration.getTime() + 30 * 24 * 60 * 60 * 1000);

        batch.update(userRef, {
          walletBalance: newBalance,
          premiumExpiresAt: Timestamp.fromDate(newExpirationDate),
        });
        logger.log(`Assinatura renovada para o usuário ${doc.id}.`);
      } else {
        // Se a data de expiração não existe, apenas remove o status premium para corrigir o dado.
        logger.warn(`Usuário ${doc.id} é premium mas não tem data de expiração. Removendo status.`);
        batch.update(userRef, { isPremium: false });
      }

    } else {
      // Expira a assinatura por falta de saldo
      batch.update(userRef, { isPremium: false });
      logger.log(`Assinatura expirada para o usuário ${doc.id} por falta de saldo.`);
    }
  });

  await batch.commit();
  logger.log(`Verificação de assinaturas concluída. ${snapshot.size} usuários processados.`);
});

// --- FIM DAS FUNÇÕES DA CARTEIRA ---

// --- INÍCIO DAS NOVAS FUNÇÕES DE VAGAS (JOBS) ---

export const postJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { title, description, category, location, durationDays, isHighlighted, budget, isNegotiable, useFreePost } = request.data;

  // Validação de entrada: o custo é calculado a partir destes valores, então
  // uma duração negativa ou não numérica não pode gerar custo negativo/NaN.
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
    throw new HttpsError("invalid-argument", "A duração deve ser um número inteiro entre 1 e 30 dias.");
  }
  if (typeof title !== "string" || !title.trim() || title.length > 120) {
    throw new HttpsError("invalid-argument", "Título inválido (máx. 120 caracteres).");
  }
  if (typeof description !== "string" || !description.trim() || description.length > 5000) {
    throw new HttpsError("invalid-argument", "Descrição inválida (máx. 5000 caracteres).");
  }
  if (typeof category !== "string" || !category) {
    throw new HttpsError("invalid-argument", "Categoria inválida.");
  }
  if (isHighlighted !== undefined && typeof isHighlighted !== "boolean") {
    throw new HttpsError("invalid-argument", "Campo 'isHighlighted' inválido.");
  }
  if (useFreePost !== undefined && typeof useFreePost !== "boolean") {
    throw new HttpsError("invalid-argument", "Campo 'useFreePost' inválido.");
  }
  const userId = request.auth.uid;
  const db = admin.firestore();

  const configDoc = await db.collection("app_config").doc("costs").get();
  if (!configDoc.exists) {
    throw new HttpsError("internal", "Configuração de custos não encontrada.");
  }
  const costs = configDoc.data()!;

  let costForExtras = 0;
  if (isHighlighted) {
    costForExtras += costs.highlightJobCost;
  }
  if (durationDays > 1) {
    costForExtras += (durationDays - 1) * costs.costPerExtraDay;
  }

  const baseCost = useFreePost ? 0 : costs.postJobBaseCost;
  const totalCost = baseCost + costForExtras;

  const userRef = db.doc(`users/${userId}`);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Usuário não encontrado.");
      }

      const userData = userDoc.data()!;
      let newBalance = userData.walletBalance || 0;

      if (useFreePost) {
        const freePosts = userData.dailyFreePosts || { count: 0 };
        if (freePosts.count <= 0) {
          throw new HttpsError("failed-precondition", "Cota de postagens gratuitas já utilizada.");
        }
        transaction.update(userRef, { "dailyFreePosts.count": FieldValue.increment(-1) });
      }

      if (totalCost > 0) {
        if (newBalance < totalCost) {
          throw new HttpsError("failed-precondition", "Saldo insuficiente para postar a vaga.");
        }
        newBalance -= totalCost;
        transaction.update(userRef, { walletBalance: newBalance });
      }

      const jobsRef = db.collection("jobs").doc();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + durationDays);

      transaction.set(jobsRef, {
        title, description, category, location, durationDays, isHighlighted,
        budget, isNegotiable, postedByUid: userId,
        postedByName: userData.displayName || "Anônimo",
        postedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expirationDate),
        status: "open",
      });
    });

    return { success: true, message: "Vaga postada com sucesso!" };
  } catch (error) {
    logger.error(`Erro ao postar vaga para o usuário ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocorreu um erro ao postar a vaga.");
  }
});

export const expireJobs = onSchedule({
  schedule: "every day 02:00",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  logger.log("Iniciando verificação de vagas expiradas...");
  const db = admin.firestore();
  const now = Timestamp.now();

  const expiredJobsQuery = db.collection("jobs")
    .where("status", "==", "open")
    .where("expiresAt", "<=", now);

  const snapshot = await expiredJobsQuery.get();
  if (snapshot.empty) {
    logger.log("Nenhuma vaga expirada encontrada.");
    return;
  }

  const batch = new ChunkedBatch(db);
  snapshot.forEach(doc => {
    // Adicionando um log para cada vaga que será expirada.
    // Se a função falhar, o último log indicará qual documento pode ter causado o problema.
    logger.log(`Marcando vaga ${doc.id} como expirada.`);
    batch.update(doc.ref, { status: "expired" });
  });

  await batch.commit();
  logger.log(`Processo concluído. ${snapshot.size} vagas foram marcadas como expiradas.`);
});

export const updateJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { jobId, title, description } = request.data;
  const userId = request.auth.uid;

  if (!jobId || !title || !description) {
    throw new HttpsError("invalid-argument", "Dados incompletos para atualizar a vaga.");
  }
  if (typeof title !== "string" || title.length > 120 || typeof description !== "string" || description.length > 5000) {
    throw new HttpsError("invalid-argument", "Título ou descrição inválidos.");
  }

  const db = admin.firestore();
  const jobRef = db.doc(`jobs/${jobId}`);

  try {
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "A vaga que você está tentando editar não existe.");
    }

    // Verifica se o usuário que está editando é o mesmo que postou a vaga
    if (jobDoc.data()?.postedByUid !== userId) {
      throw new HttpsError("permission-denied", "Você não tem permissão para editar esta vaga.");
    }

    // Atualiza apenas os campos permitidos
    await jobRef.update({
      title,
      description,
    });

    logger.log(`Vaga ${jobId} atualizada com sucesso pelo usuário ${userId}.`);
    return { success: true, message: "Vaga atualizada com sucesso!" };

  } catch (error) {
    logger.error(`Erro ao atualizar a vaga ${jobId} para o usuário ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocorreu um erro ao atualizar a vaga.");
  }
});

// --- FIM DAS NOVAS FUNÇÕES DE VAGAS (JOBS) ---

// ===================================================================
// --- FUNÇÃO PARA FAVORITAR VAGAS ---
// ===================================================================

/**
 * Adiciona ou remove uma vaga da lista de favoritos de um usuário.
 */
export const toggleFavoriteJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { jobId } = request.data;
  const userId = request.auth.uid;

  if (!jobId) {
    throw new HttpsError("invalid-argument", "O ID da vaga é necessário.");
  }

  const db = admin.firestore();
  const userRef = db.doc(`users/${userId}`);

  try {
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado.");
    }

    const favoritedJobs = userDoc.data()?.favoritedJobs || [];
    let updatedFavorites;

    if (favoritedJobs.includes(jobId)) {
      // Remove a vaga dos favoritos
      updatedFavorites = FieldValue.arrayRemove(jobId);
    } else {
      // Adiciona a vaga aos favoritos
      updatedFavorites = FieldValue.arrayUnion(jobId);
    }

    await userRef.update({ favoritedJobs: updatedFavorites });

    return { success: true, message: "Lista de favoritos atualizada." };

  } catch (error) {
    logger.error(`Erro ao favoritar a vaga ${jobId} para o usuário ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocorreu um erro ao atualizar seus favoritos.");
  }
});

// ===================================================================
// --- FUNÇÃO PARA FECHAR VAGAS ---
// ===================================================================

/**
 * Permite que o criador de uma vaga feche-a, mudando seu status para 'closed'.
 */
export const closeJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { jobId } = request.data;
  const userId = request.auth.uid;

  if (!jobId) {
    throw new HttpsError("invalid-argument", "O ID da vaga é necessário.");
  }

  const db = admin.firestore();
  const jobRef = db.doc(`jobs/${jobId}`);

  try {
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      throw new HttpsError("not-found", "A vaga que você está tentando fechar não existe.");
    }

    // Verifica se o usuário que está fechando é o mesmo que postou a vaga
    if (jobDoc.data()?.postedByUid !== userId) {
      throw new HttpsError("permission-denied", "Você não tem permissão para fechar esta vaga.");
    }

    // Verifica se a vaga já não está fechada ou expirada
    if (jobDoc.data()?.status !== "open") {
      throw new HttpsError("failed-precondition", "Esta vaga já foi encerrada.");
    }

    // Atualiza apenas o status da vaga
    await jobRef.update({
      status: "closed",
    });

    logger.log(`Vaga ${jobId} fechada com sucesso pelo usuário ${userId}.`);
    return { success: true, message: "Vaga fechada com sucesso!" };

  } catch (error) {
    logger.error(`Erro ao fechar a vaga ${jobId} para o usuário ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocorreu um erro ao fechar a vaga.");
  }
});

// ===================================================================
// --- FUNÇÃO AGENDADA PARA RESETAR COTAS ---
// ===================================================================

/**
 * Roda toda semana para resetar as cotas de todos os usuários.
 */
// A função foi renomeada para refletir a nova lógica semanal.
export const resetWeeklyQuotas = onSchedule({
  schedule: "every monday 00:00",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  logger.log("Iniciando o reset SEMANAL de cotas gratuitas...");
  const db = admin.firestore();
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    logger.log("Nenhum usuário encontrado para resetar cotas.");
    return;
  }

  const batch = new ChunkedBatch(db);
  const todayTimestamp = Timestamp.now();

  snapshot.forEach(doc => {
    const userData = doc.data();
    const isPremium = userData.isPremium || false;

    const postsQuota = isPremium ? 10 : 3;
    const applicationsQuota = isPremium ? 10 : 3;

    batch.update(doc.ref, {
      dailyFreePosts: {
        count: postsQuota,
        lastReset: todayTimestamp,
      },
      dailyFreeApplications: {
        count: applicationsQuota,
        lastReset: todayTimestamp,
      },
    });
  });

  await batch.commit();
  logger.log(`Cotas semanais resetadas para ${snapshot.size} usuários.`);
});

// ===================================================================
// --- GATILHO PARA NOTIFICAÇÃO DE NOVAS MENSAGENS ---
// ===================================================================
export const onMessageCreated = onDocumentCreated("chat_rooms/{chatRoomId}/messages/{messageId}", async (event) => {
  const messageData = event.data?.data();
  const chatRoomId = event.params.chatRoomId;
  const senderId = messageData?.senderId;

  if (!messageData || !senderId) {
    logger.log("Dados da mensagem ou senderId não encontrados.");
    return;
  }

  const roomRef = admin.firestore().doc(`chat_rooms/${chatRoomId}`);
  const roomDoc = await roomRef.get();
  const roomData = roomDoc.data();

  if (!roomData?.participants || !roomData?.participantNames) return;

  const recipientId = roomData.participants.find((p: string) => p !== senderId);
  if (!recipientId) return;

  const senderName = roomData.participantNames[senderId] || "Alguém";
  // O nome do criador da notificação é o nome do destinatário dela
  const creatorName = roomData.participantNames[recipientId] || "Você";

  // Agora passamos todos os parâmetros necessários no link
  const link = `/(app)/chat/${chatRoomId}?recipientId=${senderId}&recipientName=${encodeURIComponent(senderName)}&creatorName=${encodeURIComponent(creatorName)}`;

  await createNotification(recipientId, {
    type: "chat",
    title: `Nova mensagem de ${senderName}`,
    body: messageData.text || (messageData.mediaType ? "Enviou uma mídia" : "Nova mensagem"),
    link: link, // Usamos o novo link
  });
});


// ===================================================================
// --- GATILHO PARA NOTIFICAÇÃO DE NOVAS AVALIAÇÕES ---
// ===================================================================
export const onReviewCreated = onDocumentCreated("users/{userId}/reviews/{reviewId}", async (event) => {
  const reviewData = event.data?.data();
  const professionalId = event.params.userId; // O usuário que foi avaliado
  const reviewerId = reviewData?.reviewerId;

  if (!reviewData || !reviewerId || professionalId === reviewerId) {
    logger.log("Dados da avaliação inválidos ou autoavaliação. Ignorando.");
    return;
  }

  const reviewerName = reviewData.reviewerName || "Alguém";

  // Criar notificação para o profissional que recebeu a avaliação
  await createNotification(professionalId, {
    type: "review",
    title: "Você recebeu uma nova avaliação!",
    body: `${reviewerName} deixou uma avaliação de ${reviewData.rating} estrela(s) no seu perfil.`,
    link: `/(app)/professional/${professionalId}`,
  });
});

// ===================================================================
// --- FUNÇÃO PARA DESATIVAR A CONTA (CHAMADA PELO APP) ---
// ===================================================================
export const deactivateAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const uid = request.auth.uid;
  const userRef = admin.firestore().doc(`users/${uid}`);

  try {
    // A função deve APENAS marcar o status no Firestore.
    await userRef.update({
      status: "deactivated",
      deactivatedAt: FieldValue.serverTimestamp(),
    });

    logger.log(`Conta do usuário ${uid} foi marcada como desativada.`);
    return { success: true };
  } catch (error) {
    logger.error(`Erro ao desativar a conta ${uid}:`, error);
    throw new HttpsError("internal", "Não foi possível desativar a conta.");
  }
});

// ===================================================================
// --- FUNÇÃO AGENDADA PARA EXCLUIR CONTAS DESATIVADAS ---
// ===================================================================
export const cleanupDeactivatedAccounts = onSchedule({
  schedule: "every day 04:00", // Roda todo dia às 4 da manhã
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  logger.log("Iniciando limpeza de contas desativadas...");
  const db = admin.firestore();

  // Calcula a data de 30 dias atrás
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo);

  // Busca por usuários desativados há mais de 30 dias
  const query = db.collection("users")
    .where("status", "==", "deactivated")
    .where("deactivatedAt", "<=", cutoffTimestamp);

  const snapshot = await query.get();
  if (snapshot.empty) {
    logger.log("Nenhuma conta para excluir permanentemente.");
    return;
  }

  logger.log(`Encontradas ${snapshot.size} contas para exclusão permanente.`);

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const userRef = doc.ref;

    logger.log(`Excluindo usuário ${uid}...`);

    try {
      // Exclui do Firestore (incluindo todas as subcoleções)
      await admin.firestore().recursiveDelete(userRef);

      // Exclui do Firebase Authentication
      await admin.auth().deleteUser(uid);

      logger.log(`Usuário ${uid} excluído com sucesso.`);
    } catch (error) {
      logger.error(`Falha ao excluir usuário ${uid}:`, error);
    }
  }
});

// ===================================================================
// --- FUNÇÃO PARA REATIVAR UMA CONTA DESATIVADA ---
// ===================================================================
export const reactivateAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const uid = request.auth.uid;
  const userRef = admin.firestore().doc(`users/${uid}`);

  try {
    // Reabilita o usuário no Firebase Authentication
    await admin.auth().updateUser(uid, { disabled: false });

    // Remove os campos de desativação do Firestore
    await userRef.update({
      status: FieldValue.delete(),
      deactivatedAt: FieldValue.delete(),
    });

    logger.log(`Conta do usuário ${uid} foi reativada com sucesso.`);
    return { success: true, message: "Conta reativada com sucesso." };
  } catch (error) {
    logger.error(`Erro ao reativar a conta ${uid}:`, error);
    throw new HttpsError("internal", "Não foi possível reativar a conta.");
  }
});

// ===================================================================
// --- FUNÇÕES DE BLOQUEIO DE USUÁRIO ---
// ===================================================================

export const blockUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const uid = request.auth.uid;
  const { userIdToBlock } = request.data;

  if (!userIdToBlock) {
    throw new HttpsError("invalid-argument", "ID do usuário a ser bloqueado não fornecido.");
  }

  const userRef = admin.firestore().doc(`users/${uid}`);
  await userRef.update({
    blockedUsers: FieldValue.arrayUnion(userIdToBlock),
  });

  logger.log(`Usuário ${uid} bloqueou ${userIdToBlock}.`);
  return { success: true };
});

export const unblockUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const uid = request.auth.uid;
  const { userIdToUnblock } = request.data;

  if (!userIdToUnblock) {
    throw new HttpsError("invalid-argument", "ID do usuário a ser desbloqueado não fornecido.");
  }

  const userRef = admin.firestore().doc(`users/${uid}`);
  await userRef.update({
    blockedUsers: FieldValue.arrayRemove(userIdToUnblock),
  });

  logger.log(`Usuário ${uid} desbloqueou ${userIdToUnblock}.`);
  return { success: true };
});