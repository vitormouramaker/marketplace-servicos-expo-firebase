import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../styles/theme';

interface ButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export const QuickActionButton = ({ icon, label, onPress }: ButtonProps) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Ionicons name={icon} size={28} color={theme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flex: 1,
    marginHorizontal: theme.spacing.sm / 2,
    minHeight: 90,
  },
  label: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
});