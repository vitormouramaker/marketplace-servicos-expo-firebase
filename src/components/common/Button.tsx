import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { theme } from '../../styles/theme';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactElement;
}

export const Button = ({ title, isLoading = false, variant = 'primary', icon, ...props }: ButtonProps) => {
  const buttonStyle = [
    styles.button,
    variant === 'primary' ? styles.primary : styles.secondary,
    props.disabled ? styles.disabled : null
  ];

  return (
    <TouchableOpacity style={[...buttonStyle, props.style]} activeOpacity={0.8} {...props}>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.white} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.text}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: theme.spacing.md,
    height: 50,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: theme.spacing.sm,
  },
  text: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});