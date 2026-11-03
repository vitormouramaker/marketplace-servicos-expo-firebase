import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { theme } from '../../src/styles/theme';

export default function AppIndex() {
  const { userProfile, isLoading } = useAuth();

  if (isLoading || !userProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Se o usuário está desativado, redireciona para a tela de reativação.
  if (userProfile.status === 'deactivated') {
    return <Redirect href="/reactivate-account" />;
  }

  // Se o perfil não está completo, vai para o onboarding.
  if (!userProfile.profileCompleted) {
    return <Redirect href="/onboarding" />;
  }
  
  // Se tudo estiver normal, vai para a home.
  return <Redirect href="/home" />;
}