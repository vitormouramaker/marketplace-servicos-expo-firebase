import { useRouter } from 'expo-router';
import { DocumentData, QueryDocumentSnapshot, collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { PremiumProfessionalListCard } from '../components/premium/PremiumProfessionalListCard';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

const PAGE_SIZE = 10;

export default function PremiumProfessionalsScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPremiumProfessionals = async (loadMore = false) => {
    if (!hasMore && loadMore) return;

    try {
      let professionalsQuery;
      const baseQuery = query(
        collection(db, "users"),
        where("isPremium", "==", true),
        orderBy("displayName"),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastVisible) {
        professionalsQuery = query(baseQuery, startAfter(lastVisible));
      } else {
        professionalsQuery = baseQuery;
      }
      
      const querySnapshot = await getDocs(professionalsQuery);
      const professionalsList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== userProfile?.uid) {
          professionalsList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        }
      });
      
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastDoc);

      if (querySnapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
      }
      
      if (loadMore) {
        setProfessionals(prev => [...prev, ...professionalsList]);
      } else {
        setProfessionals(professionalsList);
      }
    } catch (error) {
      console.error("Erro ao buscar profissionais premium:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  
  useEffect(() => {
    fetchPremiumProfessionals();
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchPremiumProfessionals(true);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={professionals}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <PremiumProfessionalListCard 
            professional={item} 
            onPress={() => router.push({ pathname: '/(app)/professional/[uid]', params: { uid: item.uid } } as any)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum profissional premium encontrado.</Text>}
        ListFooterComponent={() => {
          if (!hasMore) return <Text style={styles.emptyText}>Você chegou ao fim da lista.</Text>;
          if (loadingMore) return <ActivityIndicator style={{ marginVertical: 20 }} />;
          return <Button title="Carregar Mais" onPress={handleLoadMore} variant="secondary" />;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  listContainer: { padding: theme.spacing.lg },
  emptyText: { textAlign: 'center', marginTop: 20, color: theme.colors.secondary, fontSize: 16 },
});