import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { Button } from '../common/Button';

export const BecomeProfessionalCard = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(app)/professional-profile-setup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="briefcase-outline" size={40} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Ofereça Seus Serviços</Text>
      <Text style={styles.description}>
        Ative seu perfil profissional para ser encontrado por milhares de clientes,
        gerenciar suas profissões e receber avaliações.
      </Text>
      <Button 
        title="Ativar Perfil Profissional" 
        onPress={handlePress} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: '#f8f9fa',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    fontSize: 22,
    textAlign: 'center',
    color: theme.colors.text,
  },
  description: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.secondary,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
});