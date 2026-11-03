import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Props {
  onPress: () => void;
}

export const RecentMessageCard = ({ onPress }: Props) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles-outline" size={24} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Últimas Mensagens</Text>
        <Text style={styles.subtitle}>Veja suas conversas recentes</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.lightGray} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  iconContainer: {
    backgroundColor: theme.colors.secondary,
    padding: 10,
    borderRadius: 25,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
});