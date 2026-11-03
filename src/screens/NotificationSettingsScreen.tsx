import { Stack } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

// Define os tipos de notificação e suas descrições
const NOTIFICATION_TYPES = [
  { key: 'candidatura', title: 'Novas Candidaturas', description: 'Receber um alerta quando um profissional se candidatar a uma de suas vagas.' },
  { key: 'chat', title: 'Novas Mensagens', description: 'Ser notificado sobre novas mensagens nas suas conversas.' },
  { key: 'review', title: 'Novas Avaliações', description: 'Saber quando um cliente ou profissional deixa uma nova avaliação no seu perfil.' },
  { key: 'carteira', title: 'Atividade da Carteira', description: 'Receber confirmações de recargas e débitos de moedas.' },
  { key: 'promocao', title: 'Promoções e Novidades', description: 'Ficar por dentro de ofertas especiais e novas funcionalidades do ProConecta.' },
  { key: 'sistema', title: 'Avisos do Sistema', description: 'Receber alertas importantes sobre sua conta e o aplicativo.' },
];

export default function NotificationSettingsScreen() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  
  // Inicializa o estado com as preferências do usuário ou um objeto vazio
  const [preferences, setPreferences] = useState<{ [key: string]: boolean | undefined }>(
    userProfile?.notificationPreferences || {}
    );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notificationPreferences: preferences,
      });
      await refreshUserProfile(); // Atualiza o perfil no contexto
      showModal({
        title: 'Sucesso',
        message: 'Suas preferências de notificação foram salvas.',
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
    } catch (error) {
      console.error("Erro ao salvar preferências:", error);
      showModal({
        title: 'Erro',
        message: 'Não foi possível salvar suas preferências. Tente novamente.',
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Preferências de Notificação' }} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>Gerencie suas Notificações</Text>
        <Text style={styles.headerSubtitle}>Escolha quais alertas você quer receber no seu dispositivo.</Text>
        
        {NOTIFICATION_TYPES.map(item => (
          <View key={item.key} style={styles.settingRow}>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
            <Switch
              value={preferences[item.key as keyof typeof preferences] !== false} // Padrão é true se indefinido
              onValueChange={() => handleToggle(item.key)}
              trackColor={{ false: '#767577', true: theme.colors.secondary }}
              thumbColor={preferences[item.key as keyof typeof preferences] !== false ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
        ))}

      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button title="Salvar Alterações" onPress={handleSaveChanges} isLoading={isSaving} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContainer: { padding: theme.spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, textAlign: 'center' },
  headerSubtitle: { fontSize: 15, color: theme.colors.secondary, textAlign: 'center', marginBottom: theme.spacing.xl, marginTop: theme.spacing.sm },
  settingRow: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 4,
  },
  buttonContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});