import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApplyToJobModal } from '../components/common/ApplyToJobModal';
import { Button } from '../components/common/Button';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

interface JobDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'closed' | 'expired';
  location?: { city: string; state: string };
  isHighlighted?: boolean;
  postedByName: string;
  postedByUid: string;
  postedAt?: { toDate: () => Date };
  expiresAt?: { toDate: () => Date };
  budget?: string;
  isNegotiable?: boolean;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user, userProfile } = useAuth();
  const { showModal } = useModal();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isClosingJob, setIsClosingJob] = useState(false);

  useEffect(() => {
    // O onSnapshot do AuthContext já mantém isso atualizado em tempo real.
    if (userProfile?.favoritedJobs && jobId) {
      setIsFavorited(userProfile.favoritedJobs.includes(jobId));
    }
  }, [userProfile?.favoritedJobs, jobId]);

  useEffect(() => {
    if (!jobId) return;
    const docRef = doc(db, 'jobs', jobId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setJob({ id: docSnap.id, ...docSnap.data() } as JobDetails);
      } else {
        showModal({ title: "Erro", message: "Vaga não encontrada.", buttons: [{ text: "OK", onPress: () => router.back() }] });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [jobId]);

  const handleToggleFavorite = async () => {
    if (!jobId || isTogglingFavorite) return;
    
    // Armazena o estado anterior para poder reverter em caso de erro
    const originalFavoritedState = isFavorited;

    setIsTogglingFavorite(true);
    setIsFavorited((prev) => !prev);

    showModal({
      title: "Sucesso",
      message: originalFavoritedState ? "Vaga removida dos favoritos." : "Vaga adicionada aos favoritos!",
      buttons: [{ text: "OK", onPress: () => {} }]
    });

    try {
      const functions = getFunctions();
      const toggleFavoriteJob = httpsCallable(functions, 'toggleFavoriteJob');
      await toggleFavoriteJob({ jobId });
      // O 'onSnapshot' no AuthContext vai cuidar de atualizar o estado global (userProfile)
    } catch (error) {
      console.error("Erro ao favoritar:", error);

      setIsFavorited(originalFavoritedState);
      
      showModal({
        title: "Erro",
        message: "Não foi possível atualizar seus favoritos. Tente novamente.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleCloseJob = () => {
    showModal({
      title: "Fechar Vaga",
      message: "Tem certeza que deseja fechar esta vaga? Esta ação não pode ser desfeita.",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => {} },
        {
          text: "Sim, fechar vaga",
          style: "destructive",
          onPress: async () => {
            if (!jobId) return;
            setIsClosingJob(true);
            try {
              const functions = getFunctions();
              const closeJob = httpsCallable(functions, 'closeJob');
              await closeJob({ jobId });
              showModal({ title: "Sucesso", message: "A vaga foi fechada.", buttons: [{ text: "OK", onPress: () => {} }] });
            } catch (error: any) {
              showModal({ title: "Erro", message: `Não foi possível fechar a vaga: ${error.message}`, buttons: [{ text: "OK", onPress: () => {} }] });
            } finally {
              setIsClosingJob(false);
            }
          },
        },
      ]
    });
  };

  useLayoutEffect(() => {
    const isJobOwner = user && job && user.uid === job.postedByUid;
    navigation.setOptions({
      title: "Detalhes da Vaga",
      headerRight: () => (
        <View style={styles.headerButtonsContainer}>
          {isJobOwner && job?.status === 'open' && (
            <TouchableOpacity onPress={handleCloseJob} disabled={isClosingJob} style={{ padding: 8 }}>
              {isClosingJob ? <ActivityIndicator color={theme.colors.error} /> : <Ionicons name="lock-closed-outline" size={26} color={theme.colors.error} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleToggleFavorite} disabled={isTogglingFavorite || !job} style={{ padding: 8 }}>
            <Ionicons name={isFavorited ? "star" : "star-outline"} size={28} color={isFavorited ? "#F38001" : theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, job, isFavorited, isTogglingFavorite, isClosingJob, user]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }
  if (!job) {
    return <View style={styles.centered}><Text>Não foi possível carregar os detalhes da vaga.</Text></View>;
  }

  const isJobOwner = user && job && user.uid === job.postedByUid;
  const canApply =
    (userProfile?.profileType === 'professional' || userProfile?.profileType === 'professional-premium') &&
    job.status === 'open';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          {job.isHighlighted && <Text style={styles.highlightedText}>✨ VAGA EM DESTAQUE</Text>}
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.category}>{job.category}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição do Serviço</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>
        <View style={styles.section}>
          {job.location && (
            <View style={styles.detailsRow}>
              <Ionicons name="location" size={20} color={theme.colors.primary} />
              <Text style={styles.detailsText}>{`${job.location.city}, ${job.location.state}`}</Text>
            </View>
          )}
          <View style={styles.detailsRow}>
            <Ionicons name="cash" size={20} color={theme.colors.primary} />
            <Text style={styles.detailsText}>
              {job.budget || "A combinar"}
              {job.isNegotiable ? " (Valor Negociável)" : ""}
            </Text>
          </View>
          <View style={styles.detailsRow}>
            <Ionicons name="person-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.detailsText}>{`Postado por ${job.postedByName}`}</Text>
          </View>
        </View>
        {job.status !== 'open' && (
          <View style={styles.statusBadge}>
            <Ionicons name={job.status === 'closed' ? "lock-closed" : "time"} size={16} color="white" />
            <Text style={styles.statusBadgeText}>
              Vaga {job.status === 'closed' ? 'Fechada' : 'Expirada'}
            </Text>
          </View>
        )}
      </ScrollView>

      {!isJobOwner && canApply && (
        <View style={styles.applyButtonContainer}>
          <Button title="Candidatar-se à Vaga" onPress={() => setIsApplyModalVisible(true)} />
        </View>
      )}
      {isJobOwner && job.status === 'open' && (
        <View style={styles.floatingButtonWrapper}>
          <View style={styles.floatingCard}>
            <TouchableOpacity style={[styles.pillButton, styles.pillSecondary]} onPress={() => router.push({ pathname: "/edit-job/[jobId]", params: { jobId: job.id } })} activeOpacity={0.8}>
              <Text style={styles.pillTextSecondary}>Editar Vaga</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pillButton, styles.pillPrimary]} onPress={() => router.push({ pathname: "/job-applicants/[jobId]", params: { jobId: job.id } })} activeOpacity={0.85}>
              <Text style={styles.pillTextPrimary}>Ver Candidatos</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {isJobOwner && job.status !== 'open' && (
        <View style={styles.applyButtonContainer}>
          <Button title="Ver Candidatos" onPress={() => router.push({ pathname: "/job-applicants/[jobId]", params: { jobId: job.id } })} />
        </View>
      )}

      {job && (
        <ApplyToJobModal visible={isApplyModalVisible} onClose={() => setIsApplyModalVisible(false)} jobId={job.id} jobTitle={job.title} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: 100 },
  header: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.colors.text },
  category: { fontSize: 16, color: theme.colors.primary, fontWeight: '500', marginTop: theme.spacing.xs },
  highlightedText: { color: '#c2410c', fontWeight: 'bold', fontSize: 12, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  description: { fontSize: 16, lineHeight: 24, color: theme.colors.text },
  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  detailsText: { fontSize: 16, marginLeft: theme.spacing.md, color: theme.colors.secondary },
  applyButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderTopWidth: 1, borderColor: '#f0f0f0' },
  headerButtonsContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 7 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.secondary,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  statusBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: theme.spacing.sm },
  floatingButtonWrapper: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    zIndex: 50,
    alignItems: 'center',
  },
  floatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  pillButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPrimary: {
    backgroundColor: theme.colors.primary,
  },
  pillSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  pillTextPrimary: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pillTextSecondary: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});