import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';
import { Button } from '../common/Button';
import { BecomePremiumBanner } from './BecomePremiumBanner';
import { QuickActionButton } from './QuickActionButton';
import { RatingCard } from './RatingCard';
import { RecentMessageCard } from './RecentMessageCard';
import { StatCard } from './StatCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useModal } from '../../contexts/ModalContext';

export const ProfessionalDashboard = () => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { showModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    avgRating: 0,
    reviewCount: 0,
    profileViews: 0,
    isPremium: false,
  });

  const fetchDashboardData = async () => {
    if (!user || !userProfile) {
        setLoading(false);
        return;
    }
    try {
      const reviewsRef = collection(db, 'users', user.uid, 'reviews');
      const reviewsQuery = query(reviewsRef);
      const querySnapshot = await getDocs(reviewsQuery);
      
      let totalRating = 0;
      const reviewCount = querySnapshot.size;
      
      querySnapshot.forEach(doc => {
        totalRating += doc.data().rating;
      });

      const avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;
      
      setStats({
        avgRating,
        reviewCount,
        profileViews: userProfile.viewCountLast7Days || 0,
        isPremium: userProfile.isPremium || false,
      });

    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, userProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUserProfile();
    setRefreshing(false);
  }, [refreshUserProfile]);
  
  const handleOpenModal = () => setIsModalVisible(true);
  const handleCloseModal = () => setIsModalVisible(false);

  const handlePurchasePremium = async () => {
    setIsPurchasing(true);
    try {
      const functions = getFunctions();
      const purchaseFeature = httpsCallable(functions, 'purchaseFeatureWithCoins');
      await purchaseFeature({ featureId: 'become_premium' });
      
      await refreshUserProfile();
      handleCloseModal();
      
      showModal({
        title: "Parabéns!",
        message: "Você agora é um profissional Premium!",
        buttons: [{ text: "OK", onPress: () => {} }]
      });

    } catch (error: any) {
      console.error("Erro ao comprar Premium:", error);
      if (error.code === 'functions/failed-precondition') {
        showModal({
          title: "Saldo Insuficiente",
          message: "Você não tem moedas suficientes. Por favor, recarregue sua carteira.",
          buttons: [
            {
              text: "OK",
              onPress: () => {},
              style: 'cancel',
            },
            {
              text: "Recarregar",
              onPress: () => {
                handleCloseModal();
                router.push('/wallet');
              },
              style: 'default',
            }
          ]
        });
      } else {
        showModal({
          title: "Erro",
          message: "Não foi possível completar a compra.",
          buttons: [{ text: "OK", onPress: () => {} }]
        });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {stats.isPremium ? (
        <>
          <RecentMessageCard onPress={() => router.push('/(app)/chat-list')} />
          <View style={styles.quickActions}>
            <QuickActionButton icon="search" label="Explorar" onPress={() => router.push('/explore' as any)} />
            <QuickActionButton icon="briefcase-outline" label="Vagas" onPress={() => router.push('/jobs')} />
            <QuickActionButton icon="person-circle-outline" label="Meu Perfil" onPress={() => router.push('/profile' as any)} />
          </View>
          <View style={styles.row}>
            <StatCard 
              icon="eye-outline" 
              label="Seu perfil foi visto" 
              value={`${stats.profileViews} vezes`} 
              color="#D36400" 
            />
          </View>
          <RatingCard rating={stats.avgRating} reviewCount={stats.reviewCount} />
        </>
      ) : (
        <>
          <RecentMessageCard onPress={() => router.push('/(app)/chat-list')} />
          <View style={styles.quickActions}>
            <QuickActionButton icon="search" label="Explorar" onPress={() => router.push('/explore' as any)} />
            <QuickActionButton icon="briefcase-outline" label="Vagas" onPress={() => router.push('/jobs')} />
            <QuickActionButton icon="person-circle-outline" label="Meu Perfil" onPress={() => router.push('/profile' as any)} />
          </View>
          <BecomePremiumBanner onPress={handleOpenModal} />
          <View style={styles.row}>
            <StatCard 
              icon="eye-outline" 
              label="Seu perfil foi visto" 
              value={`${stats.profileViews} vezes`} 
              color="#D36400" 
            />
          </View>
          <RatingCard rating={stats.avgRating} reviewCount={stats.reviewCount} />

          <Modal
            animationType="fade"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={handleCloseModal}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <LinearGradient colors={['#F38001', '#D36400']} style={styles.modalHeader}>
                  <MaterialCommunityIcons name="crown" size={40} color="#FFD700" />
                  <Text style={styles.modalTitle}>Desbloqueie o Potencial Máximo</Text>
                </LinearGradient>
                <View style={styles.modalBody}>
                  <Text style={styles.modalSubtitle}>Vantagens de ser um Profissional Premium:</Text>
                  <View style={styles.advantageRow}>
                    <Ionicons name="ribbon-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.advantageText}>Apareça no topo das buscas na sua região.</Text>
                  </View>
                  <View style={styles.advantageRow}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.advantageText}>Receba um selo de perfil verificado e premium.</Text>
                  </View>
                  <View style={styles.advantageRow}>
                    <Ionicons name="analytics-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.advantageText}>Tenha acesso a estatísticas detalhadas de visualização.</Text>
                  </View>
                  <View style={styles.advantageRow}>
                    <Ionicons name="images-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.advantageText}>Mostre seu trabalho com um portfólio de imagens.</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Apenas</Text>
                    <Text style={styles.priceValue}>120 moedas</Text>
                    <Text style={styles.priceLabel}>/mês</Text>
                  </View>
                  <Button 
                    title="Confirmar Assinatura" 
                    onPress={handlePurchasePremium}
                    isLoading={isPurchasing}
                    style={{ marginBottom: theme.spacing.sm, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 8 }}
                  />
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Text style={styles.closeButtonText}>Agora não</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  quickActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginTop: theme.spacing.lg,
    marginHorizontal: -(theme.spacing.sm / 2)
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.title,
    fontSize: 22,
    color: theme.colors.white,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  advantageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  advantageText: {
    flex: 1,
    fontSize: 15,
    marginLeft: theme.spacing.md,
    color: theme.colors.text,
    lineHeight: 21,
  },
  priceContainer: {
    marginVertical: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.secondary,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginVertical: 4,
  },
  closeButtonText: {
    textAlign: 'center',
    color: theme.colors.secondary,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});