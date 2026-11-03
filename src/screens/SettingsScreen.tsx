import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

const SettingItem = ({ icon, name, isPremium, onPress }: { icon: React.ReactNode, name: string, isPremium?: boolean, onPress: () => void }) => (
  <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
    {icon}
    <Text style={styles.itemText}>{name}</Text>
    <View style={{flex: 1}} />
    {isPremium && (
      <View style={styles.premiumBadge}>
        <Text style={styles.premiumText}>Premium</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={24} color={theme.colors.lightGray} />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { showModal } = useModal();
  const isPremium = userProfile?.isPremium || false;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Configurações e Atividade' }} />
      <ScrollView>
        <Text style={styles.sectionTitle}>Sua Conta</Text>
        
        <SettingItem 
          name="Preferências de Notificação"
          icon={<Ionicons name="notifications-outline" size={24} color={theme.colors.secondary} style={styles.icon} />}
          onPress={() => router.push('/notification-settings')} 
        />
        <SettingItem 
          name="Profissões"
          icon={<Ionicons name="construct-outline" size={24} color={theme.colors.secondary} style={styles.icon} />}
          onPress={() => router.push('/professions')} 
        />
        <SettingItem 
          name="Vagas Favoritas"
          icon={<Ionicons name="star-outline" size={24} color={theme.colors.secondary} style={styles.icon} />}
          onPress={() => router.push('/favorite-jobs')} 
        />
        <SettingItem 
          name="Usuários Bloqueados"
          icon={<Ionicons name="shield-outline" size={24} color={theme.colors.secondary} style={styles.icon} />}
          onPress={() => router.push('/blocked-users')} 
        />
        
        <Text style={styles.sectionTitle}>Para Profissionais</Text>
        <SettingItem 
          name="Portfólio"
          isPremium={true}
          icon={<Ionicons name="images-outline" size={24} color={theme.colors.secondary} style={styles.icon} />}
          onPress={() => {
            if (isPremium) {
              router.push('/portfolio');
            } else {
              showModal({
                title: "Funcionalidade Premium",
                message: "Apenas usuários Premium podem ter um portfólio.",
                buttons: [{ text: "OK", onPress: () => {} }]
              });
            }
          }} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  itemContainer: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    marginRight: theme.spacing.md,
  },
  itemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  premiumBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: theme.spacing.sm,
  },
  premiumText: {
    color: '#F38001',
    fontSize: 12,
    fontWeight: 'bold',
  },
});