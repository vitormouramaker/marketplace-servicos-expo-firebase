import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../styles/theme';

interface ValidationProps {
  label: string;
  isValid: boolean;
}

const ValidationRule = ({ label, isValid }: ValidationProps) => (
  <View style={styles.ruleContainer}>
    <Ionicons
      name={isValid ? 'checkmark-circle' : 'ellipse-outline'}
      size={20}
      color={isValid ? '#28a745' : theme.colors.lightGray}
    />
    <Text style={[styles.ruleText, isValid && styles.ruleTextValid]}>{label}</Text>
  </View>
);

interface PasswordStrengthIndicatorProps {
  validations: {
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    isLengthValid: boolean;
  };
}

export const PasswordStrengthIndicator = ({ validations }: PasswordStrengthIndicatorProps) => {
  return (
    <View style={styles.container}>
      <ValidationRule label="Pelo menos 8 caracteres" isValid={validations.isLengthValid} />
      <ValidationRule label="Uma letra maiúscula" isValid={validations.hasUpperCase} />
      <ValidationRule label="Uma letra minúscula" isValid={validations.hasLowerCase} />
      <ValidationRule label="Um número" isValid={validations.hasNumber} />
      <ValidationRule label="Um caractere especial (!@#...)" isValid={validations.hasSpecialChar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#fdfdfd',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  ruleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  ruleText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.secondary,
  },
  ruleTextValid: {
    color: theme.colors.text,
  },
});