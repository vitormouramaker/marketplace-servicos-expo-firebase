// app/(auth)/index.tsx

import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // O Expo Router trata '/login' como '/(auth)/login' aqui
  return <Redirect href="/login" />;
}