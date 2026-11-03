import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

export function OnboardingScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Qual o seu objetivo principal?</Text>
        <Text style={styles.subtitle}>
          Você pode mudar de ideia depois e ativar o outro perfil a qualquer momento.
        </Text>

        {/* Botão "Quero Contratar" agora funciona */}
        <TouchableOpacity 
          style={styles.optionCard} 
          onPress={() => router.push('/(app)/contractor-profile-setup')}
        >
          <Ionicons name="search" size={40} color={theme.colors.primary} />
          <Text style={styles.optionTitle}>Quero Contratar</Text>
          <Text style={styles.optionDescription}>Encontrar os melhores profissionais para os meus projetos.</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard} 
          onPress={() => router.push('/(app)/professional-profile-setup')}
        >
          <Ionicons name="briefcase" size={40} color={theme.colors.primary} />
          <Text style={styles.optionTitle}>Quero Oferecer Serviços</Text>
          <Text style={styles.optionDescription}>Aumentar minha visibilidade e conseguir novos clientes.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  shape2: { 
    position: 'absolute', 
    bottom: -80, 
    right: -100, 
    width: 250, 
    height: 250, 
    borderRadius: 125, 
    backgroundColor: theme.colors.secondary, 
    opacity: 0.1 
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xl,
  },
  optionCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  signOutButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  signOutText: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});