import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { Job, JobCard } from '../components/common/JobCard';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

export default function FavoriteJobsScreen() {
  const { userProfile } = useAuth();
  const [favoriteJobs, setFavoriteJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteJobs = async () => {
      const favoritedIds = userProfile?.favoritedJobs || [];

      if (favoritedIds.length === 0) {
        setLoading(false);
        setFavoriteJobs([]);
        return;
      }

      const jobsRef = collection(db, 'jobs');
      const q = query(jobsRef, where(documentId(), 'in', favoritedIds));
      
      try {
        const querySnapshot = await getDocs(q);
        const jobsList: Job[] = [];
        querySnapshot.forEach(doc => {
          jobsList.push({ id: doc.id, ...doc.data() } as Job);
        });
        setFavoriteJobs(jobsList);
      } catch (error) {
        console.error("Erro ao buscar vagas favoritas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchFavoriteJobs();
    }
  }, [userProfile]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Vagas Favoritas' }} />
      <FlatList
        data={favoriteJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={60} color={theme.colors.lightGray} />
            <Text style={styles.emptyText}>Você ainda não favoritou nenhuma vaga.</Text>
            <Text style={styles.emptySubtext}>Toque na estrela em uma vaga para salvá-la aqui.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: theme.spacing.md, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: theme.colors.secondary, textAlign: 'center', marginTop: theme.spacing.sm },
});