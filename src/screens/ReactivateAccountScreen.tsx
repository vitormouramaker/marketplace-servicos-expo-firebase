import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export default function ReactivateAccountScreen() {
  const router = useRouter();
  const { showModal } = useModal();
  const { userProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (userProfile?.deactivatedAt) {
      const deactivationDate = userProfile.deactivatedAt.toDate();
      const deletionDate = new Date(deactivationDate);
      deletionDate.setDate(deletionDate.getDate() + 30); // 30 dias

      const now = new Date();
      const differenceInMillis = deletionDate.getTime() - now.getTime();
      
      // Converte a diferença de milissegundos para dias
      const remainingDays = Math.ceil(differenceInMillis / (1000 * 60 * 60 * 24));
      
      setDaysLeft(remainingDays > 0 ? remainingDays : 0);
    }
  }, [userProfile]);

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      const reactivateAccount = httpsCallable(functions, 'reactivateAccount');
      await reactivateAccount();

      await auth.currentUser?.reload();

      showModal({
        title: 'Bem-vindo(a) de volta!',
        message: 'Sua conta foi reativada com sucesso.',
        buttons: [{ text: 'Continuar', onPress: () => router.replace('/(app)/home') }]
      });
    } catch (error) {
      console.error("Erro ao reativar a conta:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível reativar sua conta. Por favor, tente novamente.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Reativação de Conta' }} />

      <View style={styles.content}>
        <Ionicons name="warning-outline" size={60} color={theme.colors.primary} />
        <Text style={styles.title}>Conta em Processo de Exclusão</Text>
        <Text style={styles.subtitle}>
          Sua conta foi desativada e será excluída permanentemente.
        </Text>
        
        {daysLeft !== null && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>
              Sua conta será excluída permanentemente em <Text style={styles.daysText}>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</Text>.
            </Text>
          </View>
        )}

        <View style={styles.buttonWrapper}>
          <Button 
            title="Recuperar Minha Conta" 
            onPress={handleReactivate} 
            isLoading={isLoading} 
          />
          <Button 
            title="Sair" 
            onPress={handleLogout} 
            variant="secondary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  title: { ...theme.typography.title, textAlign: 'center', marginTop: theme.spacing.lg },
  subtitle: { ...theme.typography.body, color: theme.colors.secondary, textAlign: 'center', marginVertical: theme.spacing.md, lineHeight: 22 },
  countdownContainer: {
    backgroundColor: '#fffbeb',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  countdownText: {
    fontSize: 15,
    color: theme.colors.text,
    textAlign: 'center',
  },
  daysText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: theme.spacing.xl,
  },
});