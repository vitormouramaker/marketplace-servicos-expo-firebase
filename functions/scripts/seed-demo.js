/* eslint-disable */
/**
 * Seed de demonstração para o Firebase Emulator Suite.
 *
 * Cria contas de teste (Auth), catálogo (categorias, profissões, pacotes de moedas,
 * custos), vagas, uma candidatura, uma conversa e avaliações. Todo o conteúdo é
 * fictício. Pode ser executado várias vezes: os ids são fixos.
 *
 * Uso (com os emuladores rodando):  npm --prefix functions run seed:demo
 *
 * Segurança: só roda contra os EMULADORES e só com projeto "demo-*".
 * Recusa NODE_ENV=production.
 */
const DEMO_PASSWORD = 'Demo@1234';

if (process.env.NODE_ENV === 'production') {
  console.error('[seed] Recusado: NODE_ENV=production. Este script é só para o ambiente local.');
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'demo-proconecta';
if (!projectId.startsWith('demo-')) {
  console.error(`[seed] Recusado: o projeto "${projectId}" não é um projeto de demonstração (prefixo "demo-").`);
  process.exit(1);
}

// Força o uso dos emuladores (nunca toca um projeto real).
const host = process.env.EMULATOR_HOST || '127.0.0.1';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || `${host}:8080`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || `${host}:9099`;

const admin = require('firebase-admin');
admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();
const { Timestamp, FieldValue } = admin.firestore;

const daysFromNow = (d) => Timestamp.fromDate(new Date(Date.now() + d * 24 * 60 * 60 * 1000));

// CPF fictício com dígitos verificadores válidos (passa na validação do app).
function fakeCpf(base9) {
  const digits = base9.split('').map(Number);
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i);
    const r = (sum * 10) % 11;
    digits.push(r === 10 ? 0 : r);
  }
  return digits.join('');
}

const CATEGORIES = [
  { id: 'reformas', name: 'Reformas e Reparos', icon: 'construct-outline' },
  { id: 'eletrica', name: 'Elétrica', icon: 'flash-outline' },
  { id: 'hidraulica', name: 'Hidráulica', icon: 'water-outline' },
  { id: 'limpeza', name: 'Limpeza', icon: 'sparkles-outline' },
  { id: 'tecnologia', name: 'Tecnologia', icon: 'laptop-outline' },
  { id: 'aulas', name: 'Aulas', icon: 'school-outline' },
  { id: 'beleza', name: 'Beleza', icon: 'cut-outline' },
  { id: 'eventos', name: 'Eventos', icon: 'musical-notes-outline' },
];

const PROFESSIONS = [
  ['Pedreiro', 'Reformas e Reparos'], ['Pintor', 'Reformas e Reparos'], ['Marceneiro', 'Reformas e Reparos'],
  ['Eletricista', 'Elétrica'], ['Instalador de Ar-Condicionado', 'Elétrica'],
  ['Encanador', 'Hidráulica'],
  ['Diarista', 'Limpeza'], ['Limpeza Pós-Obra', 'Limpeza'],
  ['Desenvolvedor Web', 'Tecnologia'], ['Técnico de Informática', 'Tecnologia'], ['Designer Gráfico', 'Tecnologia'],
  ['Professor de Inglês', 'Aulas'], ['Professor de Matemática', 'Aulas'],
  ['Cabeleireiro', 'Beleza'], ['Manicure', 'Beleza'],
  ['Fotógrafo', 'Eventos'], ['DJ', 'Eventos'], ['Garçom', 'Eventos'],
];

// Preços fictícios.
const COIN_PACKAGES = [
  { productId: 'pacote-50', amountCoins: 50, bonusCoins: 0, priceBRL: 9.9, order: 1 },
  { productId: 'pacote-120', amountCoins: 120, bonusCoins: 10, priceBRL: 19.9, isPopular: true, order: 2 },
  { productId: 'pacote-300', amountCoins: 300, bonusCoins: 45, priceBRL: 44.9, order: 3 },
];

const COSTS = {
  postJobBaseCost: 10,
  highlightJobCost: 15,
  costPerExtraDay: 2,
  applyToJobCost: 5,
  premiumApplyDiscount: 0.5,
};

const freeQuota = (count) => ({ count, lastReset: Timestamp.now() });

const USERS = [
  {
    uid: 'demo-contratante',
    email: 'contratante@demo.proconecta.test',
    cpf: fakeCpf('900000001'),
    profile: {
      fullName: 'Carla Contratante (demo)', displayName: 'Carla Demo',
      phone: '(11) 90000-0001', address: { city: 'São Paulo', state: 'SP' },
      profileType: 'contractor', profileCompleted: true,
      walletBalance: 200, isPremium: false,
      dailyFreePosts: freeQuota(3), dailyFreeApplications: freeQuota(3),
    },
  },
  {
    uid: 'demo-profissional',
    email: 'profissional@demo.proconecta.test',
    cpf: fakeCpf('900000002'),
    profile: {
      fullName: 'Paulo Profissional (demo)', displayName: 'Paulo Eletricista',
      phone: '(11) 90000-0002', address: { city: 'São Paulo', state: 'SP' },
      profileType: 'professional', profileCompleted: true,
      profession: 'Eletricista',
      bio: 'Perfil fictício de demonstração. Instalações residenciais, troca de disjuntores e manutenção preventiva.',
      walletBalance: 40, isPremium: false,
      dailyFreePosts: freeQuota(3), dailyFreeApplications: freeQuota(3),
      viewCountLast7Days: 0,
    },
    professions: [{ name: 'Eletricista', level: 'Pleno', isMaster: true }],
  },
  {
    uid: 'demo-premium',
    email: 'premium@demo.proconecta.test',
    cpf: fakeCpf('900000003'),
    profile: {
      fullName: 'Renata Premium (demo)', displayName: 'Renata Designer',
      phone: '(11) 90000-0003', address: { city: 'Campinas', state: 'SP' },
      profileType: 'professional', profileCompleted: true,
      profession: 'Designer Gráfico',
      bio: 'Perfil fictício de demonstração. Identidade visual, materiais para redes sociais e apresentações.',
      website: 'https://example.com', instagram: 'https://www.instagram.com/example',
      walletBalance: 300, isPremium: true, premiumExpiresAt: daysFromNow(30), random: 0.5,
      dailyFreePosts: freeQuota(10), dailyFreeApplications: freeQuota(10),
      viewCountLast7Days: 0,
    },
    professions: [
      { name: 'Designer Gráfico', level: 'Sênior', isMaster: true },
      { name: 'Fotógrafo', level: 'Júnior', isMaster: false },
    ],
  },
  {
    uid: 'demo-encanador',
    email: 'encanador@demo.proconecta.test',
    cpf: fakeCpf('900000004'),
    profile: {
      fullName: 'Edu Encanador (demo)', displayName: 'Edu Hidráulica',
      phone: '(11) 90000-0004', address: { city: 'São Paulo', state: 'SP' },
      profileType: 'professional', profileCompleted: true,
      profession: 'Encanador',
      bio: 'Perfil fictício de demonstração. Vazamentos, instalação de louças e aquecedores.',
      walletBalance: 0, isPremium: false,
      dailyFreePosts: freeQuota(3), dailyFreeApplications: freeQuota(3),
    },
    professions: [{ name: 'Encanador', level: 'Especialista', isMaster: true }],
  },
];

const JOBS = [
  {
    id: 'demo-vaga-tomadas',
    title: 'Instalar 6 tomadas e trocar o disjuntor',
    description: 'Apartamento de 2 quartos. Preciso instalar tomadas novas na cozinha e trocar um disjuntor que desarma. (vaga fictícia)',
    category: 'Elétrica', budget: 'R$ 350,00', isNegotiable: true, isHighlighted: true, durationDays: 7,
  },
  {
    id: 'demo-vaga-logo',
    title: 'Logo para uma pequena padaria',
    description: 'Busco designer para criar logo e cartão de visita. Entrega digital. (vaga fictícia)',
    category: 'Tecnologia', budget: 'A combinar', isNegotiable: true, isHighlighted: false, durationDays: 5,
  },
  {
    id: 'demo-vaga-vazamento',
    title: 'Conserto de vazamento na pia',
    description: 'Vazamento embaixo da pia da cozinha. Preferência para atendimento no fim de semana. (vaga fictícia)',
    category: 'Hidráulica', budget: 'R$ 150,00', isNegotiable: false, isHighlighted: false, durationDays: 3,
  },
];

async function upsertAuthUser({ uid, email, profile }) {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { email, password: DEMO_PASSWORD, displayName: profile.displayName, disabled: false });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    await auth.createUser({ uid, email, password: DEMO_PASSWORD, displayName: profile.displayName, emailVerified: true });
  }
}

async function main() {
  console.log(`[seed] Projeto ${projectId} | Firestore ${process.env.FIRESTORE_EMULATOR_HOST} | Auth ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  const batch = db.batch();

  CATEGORIES.forEach((c, i) => batch.set(db.doc(`categories/${c.id}`), { name: c.name, icon: c.icon, order: i + 1 }));
  PROFESSIONS.forEach(([name, categoryName]) => {
    const id = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    batch.set(db.doc(`professions/${id}`), { name, categoryName });
  });
  COIN_PACKAGES.forEach((p) => batch.set(db.doc(`coin_packages/${p.productId}`), p));
  batch.set(db.doc('app_config/costs'), COSTS);
  await batch.commit();
  console.log('[seed] Catálogo: categorias, profissões, pacotes de moedas e custos.');

  for (const u of USERS) {
    await upsertAuthUser(u);
    const userRef = db.doc(`users/${u.uid}`);
    await userRef.set({ uid: u.uid, email: u.email, createdAt: Timestamp.now(), ...u.profile }, { merge: true });
    await db.doc(`users/${u.uid}/private/account`).set({ cpf: u.cpf }, { merge: true });
    await db.doc(`cpf_references/${u.cpf}`).set({ userId: u.uid });
    for (const [i, p] of (u.professions || []).entries()) {
      await db.doc(`users/${u.uid}/userProfessions/demo-${i + 1}`).set(p);
    }
    await db.doc(`users/${u.uid}/notifications/demo-boas-vindas`).set({
      type: 'sistema',
      title: 'Bem-vindo(a) ao ambiente de demonstração!',
      body: 'Todos os dados aqui são fictícios e existem só nos emuladores locais.',
      link: '/',
      isRead: false,
      createdAt: Timestamp.now(),
    });
    console.log(`[seed] Usuário ${u.email}`);
  }

  const owner = USERS[0];
  for (const j of JOBS) {
    const { id, ...data } = j;
    await db.doc(`jobs/${id}`).set({
      ...data,
      location: { city: 'São Paulo', state: 'SP' },
      postedByUid: owner.uid,
      postedByName: owner.profile.displayName,
      postedAt: Timestamp.now(),
      expiresAt: daysFromNow(j.durationDays),
      status: 'open',
    });
  }
  console.log(`[seed] ${JOBS.length} vagas abertas de ${owner.email}`);

  // Candidatura do profissional na vaga de elétrica.
  const pro = USERS[1];
  await db.doc(`jobs/demo-vaga-tomadas/applicants/${pro.uid}`).set({
    applicantName: pro.profile.displayName,
    applicantPhotoURL: null,
    applicantHeadline: pro.profile.profession,
    appliedAt: Timestamp.now(),
    coverLetter: 'Olá! Tenho experiência com instalações residenciais e posso ir no sábado. (mensagem fictícia)',
  });
  await db.doc(`users/${pro.uid}`).update({ appliedJobs: FieldValue.arrayUnion('demo-vaga-tomadas') });

  // Conversa entre contratante e profissional (id determinístico, como no app).
  const participants = [owner.uid, pro.uid].sort();
  const roomId = participants.join('_');
  await db.doc(`chat_rooms/${roomId}`).set({
    participants,
    participantNames: { [owner.uid]: owner.profile.displayName, [pro.uid]: pro.profile.displayName },
    participantPhotoURLs: { [owner.uid]: null, [pro.uid]: null },
    createdAt: Timestamp.now(),
  }, { merge: true });
  await db.doc(`chat_rooms/${roomId}/messages/demo-1`).set({
    text: 'Oi Paulo, vi sua candidatura. Consegue passar um orçamento?', senderId: owner.uid, createdAt: Timestamp.now(),
  });
  await db.doc(`chat_rooms/${roomId}/messages/demo-2`).set({
    text: 'Claro! Posso visitar no sábado de manhã para avaliar.', senderId: pro.uid,
    createdAt: Timestamp.fromMillis(Date.now() + 1000),
  });
  console.log('[seed] Conversa de exemplo criada.');

  // Avaliações.
  await db.doc(`users/${pro.uid}/reviews/demo-review-1`).set({
    rating: 5, comment: 'Serviço rápido e caprichado. (avaliação fictícia)',
    reviewerId: owner.uid, reviewerName: owner.profile.displayName, createdAt: Timestamp.now(),
  });
  await db.doc(`users/demo-premium/reviews/demo-review-2`).set({
    rating: 4, comment: 'Ótimo atendimento, entregou no prazo. (avaliação fictícia)',
    reviewerId: owner.uid, reviewerName: owner.profile.displayName, createdAt: Timestamp.now(),
  });

  console.log(`\n[seed] Pronto. Senha de todas as contas: ${DEMO_PASSWORD}`);
  USERS.forEach((u) => console.log(`  - ${u.email}`));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('[seed] Falhou:', err);
  process.exit(1);
});
