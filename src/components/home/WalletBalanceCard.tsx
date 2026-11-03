import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from "expo-router";
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Props {
  balance: number;
}

export const WalletBalanceCard = ({ balance }: Props) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push("/(app)/wallet" as Href)}
    >
      <View style={styles.textContainer}>

        <Text style={styles.label}>Meu Saldo</Text>
        
        <View style={styles.balanceContainer}>
          <Image
            source={require('../../../assets/images/coin-icon.png')}
            style={styles.coinIcon}
          />
          <Text style={styles.balance}>{balance.toLocaleString('pt-BR')} moedas</Text>
        </View>

      </View>
      <View style={styles.iconContainer}>
        <Ionicons name="add" size={20} color={theme.colors.primary} />
        <Text style={styles.actionText}>Carregar</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  textContainer: {},
  label: {
    fontSize: 14,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginRight: theme.spacing.sm,
  },
  balance: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff2e4ff',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
  },
  actionText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
});