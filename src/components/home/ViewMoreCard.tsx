import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

// A interface agora aceita a propriedade onPress
interface Props {
  onPress: () => void;
}

export const ViewMoreCard = ({ onPress }: Props) => {
  return (
    // O onPress do TouchableOpacity usa a propriedade recebida
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name="arrow-forward" size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.text}>Ver Mais</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 180,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: '#ffe5caff',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});