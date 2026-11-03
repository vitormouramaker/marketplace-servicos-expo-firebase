import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/styles/theme';

export default function AppLayout() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Configurações e Atividade' }} />
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: 'Meu Perfil',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/settings')}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="menu" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <Stack.Screen name="explore" options={{ title: 'Explorar' }} />
      
      <Stack.Screen name="chat/[chatRoomId]" />

      <Stack.Screen name="professional/[uid]" options={{ title: 'Perfil do Profissional' }} />
      <Stack.Screen name="leave-review/[userId]" options={{ title: 'Deixar Avaliação', presentation: 'modal' }} />
      <Stack.Screen name="suggest-profession" options={{ title: 'Sugerir Profissão', presentation: 'modal' }} />
      <Stack.Screen name="add-profession" options={{ title: 'Adicionar Profissão', presentation: 'modal' }} />
      <Stack.Screen name="edit-profession/[professionId]" options={{ title: 'Editar Profissão', presentation: 'modal' }} />
      <Stack.Screen name="premium-professionals" options={{ title: 'Profissionais Premium' }} />

      <Stack.Screen name="contractor-profile-setup" options={{ headerShown: false }} />
      <Stack.Screen name="professional-profile-setup" options={{ headerShown: false }} />
    </Stack>
  );
}