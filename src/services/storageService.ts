import { getDownloadURL, ref, uploadBytes, UploadMetadata } from 'firebase/storage';
import { storage } from './firebaseConfig';

const uploadBlob = async (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.log(e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

export const uploadImageAndGetURL = async (uri: string, userId: string): Promise<string> => {
  try {
    const blob = await uploadBlob(uri);
    const storageRef = ref(storage, `profile_images/${userId}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Erro detalhado no upload:", JSON.stringify(error, null, 2));
    throw new Error("Não foi possível fazer o upload da imagem.");
  }
};

// Função para fazer upload de mídias do chat (imagens, vídeos, documentos)
export const uploadChatMedia = async (
  uri: string,
  fileName: string,
  chatRoomId: string,
  participants: string[]
): Promise<string> => {
  try {
    const blob = await uploadBlob(uri);
    // Cria um caminho único para o arquivo no Storage (as regras não permitem
    // sobrescrever um arquivo existente, então dois "image.jpg" não colidem).
    const safeName = fileName.replace(/[^\w.\-]+/g, '_');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeName}`;
    const storageRef = ref(storage, `chat_media/${chatRoomId}/${uniqueName}`);
    
    // Metadados informativos. A autorização usa a lista de participantes
    // do documento da sala no Firestore (veja storage.rules).
    const metadata: UploadMetadata = {
      customMetadata: {
        'participants': participants.join(','),
      }
    };
    
    // Faz o upload do arquivo com os metadados
    await uploadBytes(storageRef, blob, metadata);
    
    // Retorna a URL de download do arquivo
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Erro detalhado no upload de mídia do chat:", JSON.stringify(error, null, 2));
    throw new Error("Não foi possível fazer o upload da mídia.");
  }
};

// Função para importar imagens no portfólio
export const uploadPortfolioImage = async (uri: string, userId: string): Promise<string> => {
  try {
    const blob = await uploadBlob(uri);
    // Gera um nome de arquivo único para cada imagem
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const storageRef = ref(storage, `portfolio_images/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Erro no upload da imagem do portfólio:", error);
    throw new Error("Não foi possível fazer o upload da imagem.");
  }
};