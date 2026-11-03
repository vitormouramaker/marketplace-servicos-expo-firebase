import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, initializeAuth } from 'firebase/auth';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Configuração do Firebase lida de variáveis EXPO_PUBLIC_* (veja `.env.example`).
 *
 * Sem nenhuma variável definida, o app usa o projeto de demonstração
 * `demo-proconecta` e se conecta ao Firebase Emulator Suite local.
 * Projetos com prefixo `demo-` nunca acessam recursos reais do Google.
 */
const DEMO_PROJECT_ID = 'demo-proconecta';
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || DEMO_PROJECT_ID;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000',
};

// Emuladores: ligados por padrão no projeto demo, ou explicitamente via env.
const isUsingEmulators =
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
  (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS !== 'false' && projectId.startsWith('demo-'));

// No emulador Android, "localhost" é o próprio emulador; o host da máquina é 10.0.2.2.
// Em aparelho físico, use o IP da máquina na rede local (EXPO_PUBLIC_EMULATOR_HOST).
const emulatorHost =
  process.env.EXPO_PUBLIC_EMULATOR_HOST || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);
// Instância padrão: as telas chamam getFunctions() sem argumentos e recebem esta mesma instância.
const functions = getFunctions(app);

if (isUsingEmulators) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectStorageEmulator(storage, emulatorHost, 9199);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

export { auth, db, functions, isUsingEmulators, storage };
