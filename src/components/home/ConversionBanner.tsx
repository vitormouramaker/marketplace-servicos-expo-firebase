// src/components/home/ConversionBanner.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';

export const ConversionBanner = () => {
  // Hook para navegação
  const router = useRouter();

  // Leva o usuário para a tela de configuração de perfil profissional
  const handlePress = () => {
    router.push('/(app)/professional-profile-setup');
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Ionicons name="briefcase-outline" size={32} color={theme.colors.white} />
        <Text style={styles.title}>Você também é um profissional?</Text>
        <Text style={styles.subtitle}>Ofereça seus serviços e ganhe mais clientes!</Text>
        <Text style={styles.cta}>Ativar Perfil Profissional →</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  cta: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
});