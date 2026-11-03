import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Props {
  onPress: () => void;
}

export const BecomePremiumBanner = ({ onPress }: Props) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={['#7e31c2ff', '#471276']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="crown" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Destaque seu Perfil!</Text>
          <Text style={styles.subtitle}>Torne-se Premium para alcançar mais clientes.</Text>
        </View>
        <View>
          <Text style={styles.cta}>Saiba Mais</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    backgroundColor: '#F38001',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F38001',
  },
  subtitle: {
    fontSize: 13,
    color: '#ffffffff',
  },
  cta: {
    fontWeight: 'bold',
    color: '#F38001',
  }
});