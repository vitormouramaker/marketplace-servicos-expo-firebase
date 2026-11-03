// app/(auth)/_layout.tsx

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();

  // Se o usuário estiver logado, redireciona para a tela principal do app.
  if (user) {
    return <Redirect href="/(app)" />;
  }

  // Se não estiver logado, mostra as telas de autenticação.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}