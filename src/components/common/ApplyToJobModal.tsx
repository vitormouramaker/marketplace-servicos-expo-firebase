import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';
import { Button } from './Button';
import { CountdownTimer } from './CountdownTimer';
import { Input } from './Input';
import { useModal } from '../../contexts/ModalContext';
import { useRouter } from 'expo-router';
import { getNextMondayMidnight } from '../../utils/dateHelpers';

interface Props {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}

const APPLY_COST = 5; 
const PREMIUM_DISCOUNT = 0.5;

export const ApplyToJobModal = ({ visible, onClose, jobId, jobTitle }: Props) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const router = useRouter(); // << INSTANCIAR O ROUTER
  const [coverLetter, setCoverLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isPremium = userProfile?.isPremium || false;
  const finalCost = isPremium ? APPLY_COST * (1 - PREMIUM_DISCOUNT) : APPLY_COST;

  const freeApplicationsAvailable = userProfile?.dailyFreeApplications?.count ?? 0;
  const hasFreeApplications = freeApplicationsAvailable > 0;

  // const getNextResetDate = (lastResetTimestamp: any) => {
  //   if (!lastResetTimestamp) return new Date();
  //   const lastResetDate = lastResetTimestamp.toDate();
  //   const nextResetDate = new Date(lastResetDate);
  //   nextResetDate.setDate(nextResetDate.getDate() + 1);
  //   return nextResetDate;
  // };

  const handleApply = async () => {
    if (!hasFreeApplications && (userProfile?.walletBalance ?? 0) < finalCost) {
      showModal({
        title: "Saldo Insuficiente",
        message: `Você precisa de ${finalCost} moedas para se candidatar. Por favor, recarregue sua carteira.`,
        buttons: [
          {
            text: "OK",
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: "Recarregar",
            onPress: () => {
              onClose();
              setTimeout(() => router.push('/wallet'), 100);
            },
            style: 'default',
          }
        ]
      });
      return;
    }

    setIsLoading(true);
    try {
      const functions = getFunctions();
      const applyToJob = httpsCallable(functions, 'applyToJob');
      await applyToJob({ jobId, coverLetter });

      await refreshUserProfile();
      
      showModal({
        title: "Sucesso!",
        message: "Sua candidatura foi enviada com sucesso.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      onClose();

    } catch (error: any) {
      console.error("Erro ao se candidatar à vaga:", error);
      showModal({
        title: "Erro",
        message: `Não foi possível enviar sua candidatura: ${error.message}`,
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Candidatar-se</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.jobTitle}>Você está se candidatando para: <Text style={{fontWeight: 'bold'}}>{jobTitle}</Text></Text>
            
            <Input
              label="Mensagem de Apresentação (Opcional)"
              placeholder="Fale um pouco sobre por que você é a pessoa certa para este serviço."
              value={coverLetter}
              onChangeText={setCoverLetter}
              multiline
              style={{ height: 120, textAlignVertical: 'top' }}
            />

            <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>Custo para se candidatar:</Text>
            {hasFreeApplications ? (
              <Text style={styles.freeText}>GRÁTIS (Cota semanal)</Text>
            ) : (
              <>
                {isPremium && <Text style={styles.discountText}>Desconto Premium aplicado!</Text>}
                <View style={styles.costContainer}>
                  <Ionicons name="logo-bitcoin" size={24} color={theme.colors.primary} />
                  <Text style={styles.costText}>{finalCost} moedas</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.quotaContainer}>
            <Text style={styles.quotaText}>
              {freeApplicationsAvailable} postagens gratuitas restantes esta semana. 
            </Text>
            {userProfile?.dailyFreeApplications?.lastReset && (
              <CountdownTimer targetDate={getNextMondayMidnight()} />
            )}
          </View>

            <Button
              title="Confirmar Candidatura"
              onPress={handleApply}
              isLoading={isLoading}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  modalContainer: { width: '100%', backgroundColor: 'white', borderRadius: theme.borderRadius.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  title: { fontSize: 20, fontWeight: 'bold' },
  body: { padding: theme.spacing.lg },
  jobTitle: { fontSize: 16, color: theme.colors.secondary, marginBottom: theme.spacing.lg, textAlign: 'center' },
  summaryContainer: { marginVertical: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: '#ffefddff', borderRadius: theme.borderRadius.md, alignItems: 'center' },
  summaryText: { fontSize: 14, fontWeight: '500' },
  discountText: { fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' },
  costContainer: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs },
  costText: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary, marginLeft: theme.spacing.sm },
  freeText: { fontSize: 22, fontWeight: 'bold', color: '#28a745', },
  quotaContainer: { alignItems: 'center', marginBottom: theme.spacing.md },
  quotaText: { fontSize: 14, color: theme.colors.secondary },
});