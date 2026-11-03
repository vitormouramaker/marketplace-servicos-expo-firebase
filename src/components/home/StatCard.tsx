import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../styles/theme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

export const StatCard = ({ icon, label, value, color }: StatCardProps) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm / 2,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  label: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
});