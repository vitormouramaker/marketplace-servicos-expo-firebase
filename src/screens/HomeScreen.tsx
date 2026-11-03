import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query, startAt, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProfessionalCard } from '../components/common/ProfessionalCard';
import { CategoriesGrid } from '../components/home/CategoriesGrid';
import { ConversionBanner } from '../components/home/ConversionBanner';
import { PremiumProfessionalCard } from '../components/home/PremiumProfessionalCard';
import { ProfessionalDashboard } from '../components/home/ProfessionalDashboard';
import { QuickActionButton } from '../components/home/QuickActionButton';
import { RecentMessageCard } from '../components/home/RecentMessageCard';
import { ViewMoreCard } from '../components/home/ViewMoreCard';
import { WalletBalanceCard } from '../components/home/WalletBalanceCard';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, unreadNotifications, refreshUserProfile } = useAuth();
  const [premium, setPremium] = useState<UserProfile[]>([]);
  const [featured, setFeatured] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (userProfile?.profileType !== 'contractor') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const randomPoint = Math.random();
      const premiumQuery = query(
        collection(db, "users"),
        where("isPremium", "==", true),
        orderBy("random"),
        startAt(randomPoint),
        limit(5)
      );
      const premiumSnapshot = await getDocs(premiumQuery);
      const premiumList = premiumSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setPremium(premiumList);

      const featuredQuery = query(collection(db, "users"), where("profileType", "==", "professional"), where("isPremium", "!=", true), limit(5));
      const featuredSnapshot = await getDocs(featuredQuery);
      const featuredList = featuredSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setFeatured(featuredList);

      await refreshUserProfile();

    } catch (error) {
      console.error("Erro ao buscar dados da Home:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
        fetchData();
    }
  }, [userProfile?.profileType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [userProfile?.profileType]);


  const navigateToProfile = (uid: string) => {
    router.push({ pathname: '/(app)/professional/[uid]', params: { uid } } as any);
  };
  
  const renderPremiumListItem = ({ item }: { item: UserProfile | { isViewMore: boolean } }) => {
    if ('isViewMore' in item && item.isViewMore) {
      return <ViewMoreCard onPress={() => router.push('/(app)/premium-professionals')} />;
    }
    const professional = item as UserProfile;
    return <PremiumProfessionalCard professional={professional} onPress={() => navigateToProfile(professional.uid)} />;
  };

  const renderContent = () => {
    if (loading && !refreshing) { // Mostra o loading inicial apenas se não estiver fazendo refresh
      return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    if (userProfile?.profileType === 'professional') {
      return <ProfessionalDashboard />;
    }

    const premiumData = premium.length > 0 ? [...premium, { isViewMore: true }] : [];

    return (
      <>
        <View style={styles.messagesCardContainer}>
          <RecentMessageCard onPress={() => router.push('/(app)/chat-list')} />
        </View>

        <View style={styles.quickActions}>
          <QuickActionButton icon="search" label="Explorar" onPress={() => router.push('/(app)/explore' as any)} />
          <QuickActionButton icon="briefcase-outline" label="Vagas" onPress={() => router.push('/jobs')} />
          <QuickActionButton icon="person-circle-outline" label="Meu Perfil" onPress={() => router.push('/(app)/profile' as any)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profissionais premium</Text>
          <FlatList
            data={premiumData}
            keyExtractor={(item) => 'isViewMore' in item ? 'view-more' : item.uid}
            renderItem={renderPremiumListItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: theme.spacing.lg }}
            ListEmptyComponent={
              <ViewMoreCard onPress={() => router.push('/(app)/premium-professionals')} />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explorar por Categoria</Text>
          <CategoriesGrid />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destaques na sua Região</Text>
          {featured.map(prof => (
            <ProfessionalCard key={prof.uid} professional={prof} onPress={() => navigateToProfile(prof.uid)} />
          ))}
        </View>
        
        <View style={styles.section}>
          <ConversionBanner />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.greeting}>Olá, {userProfile?.displayName}!</Text>
            <Text style={styles.subtitle}>
              {userProfile?.profileType === 'professional' 
                ? 'Veja o resumo de sua atividade.' 
                : 'Encontre o serviço perfeito para você.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={28} color={theme.colors.text} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <WalletBalanceCard balance={userProfile?.walletBalance ?? 0} />
        
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
    paddingTop: theme.spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  scrollContainer: { paddingVertical: theme.spacing.lg, paddingBottom: 50 },
  greeting: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: theme.colors.text 
  },
  subtitle: { 
    fontSize: 16, 
    color: theme.colors.secondary, 
    marginBottom: 0 
  },
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingHorizontal: theme.spacing.lg - (theme.spacing.sm / 2),
    marginTop: theme.spacing.lg,
  },
  messagesCardContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  section: { marginTop: theme.spacing.xl },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
});