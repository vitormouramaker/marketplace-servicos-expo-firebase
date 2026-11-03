import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface CheckboxProps {
  label: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}

export const Checkbox = ({ label, value, onValueChange }: CheckboxProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onValueChange(!value)} activeOpacity={0.8}>
      <View style={[styles.box, value && styles.boxChecked]}>
        {value && <Ionicons name="checkmark" size={16} color={theme.colors.white} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  boxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    fontSize: 15,
    color: theme.colors.text,
  },
});