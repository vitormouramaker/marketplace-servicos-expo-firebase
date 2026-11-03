import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  style?: TextInputProps['style'];
}

export const Input = ({ label, error, style, secureTextEntry, ...props }: InputProps) => {
  // Estado para controlar a visibilidade da senha
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // A lógica do "olho mágico" só se aplica se o campo for de senha
  const isPasswordField = secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          // O estilo externo (para o campo de Bio) é mesclado aqui
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.placeholder}
          // A visibilidade é controlada pelo estado
          secureTextEntry={isPasswordField && !isPasswordVisible}
          {...props}
        />
        {/* O ícone só aparece se for um campo de senha */}
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIconContainer}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={theme.colors.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeIconContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.error,
    fontSize: 12,
  },
});