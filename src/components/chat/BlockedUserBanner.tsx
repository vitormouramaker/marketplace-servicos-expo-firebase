// src/components/chat/BlockedUserBanner.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';

interface BlockedUserBannerProps {
  userName: string;
  onUnblock: () => void;
  isLoading: boolean;
}

export const BlockedUserBanner = ({ userName, onUnblock, isLoading }: BlockedUserBannerProps) => {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={24} color={theme.colors.secondary} />
      <Text style={styles.text}>Você bloqueou {userName}.</Text>
      <Text style={styles.subtext}>Para enviar uma mensagem, desbloqueie este usuário.</Text>
      <Button 
        title="Desbloquear" 
        onPress={onUnblock} 
        isLoading={isLoading}
        style={styles.button}
        variant="secondary"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginVertical: theme.spacing.sm,
  },
  subtext: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  button: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.secondary,
    borderWidth: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  }
});