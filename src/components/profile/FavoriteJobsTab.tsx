import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';
import { Job, JobCard } from '../common/JobCard';
import { Ionicons } from '@expo/vector-icons';

export const FavoriteJobsTab = () => {
  const { userProfile } = useAuth();
  const [favoriteJobs, setFavoriteJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteJobs = async () => {
      // Pega a lista de IDs das vagas favoritadas do perfil do usuário
      const favoritedIds = userProfile?.favoritedJobs || [];

      // Se não houver vagas favoritadas, não há nada a buscar
      if (favoritedIds.length === 0) {
        setLoading(false);
        setFavoriteJobs([]);
        return;
      }

      const jobsRef = collection(db, 'jobs');
      // Cria uma consulta que busca documentos ONDE o ID do documento está DENTRO da nossa lista de favoritos
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

    // A busca só é acionada se o perfil do usuário já estiver carregado
    if (userProfile) {
      fetchFavoriteJobs();
    }
  }, [userProfile]); // Re-executa a busca sempre que o perfil do usuário for atualizado

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <FlatList
      data={favoriteJobs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <JobCard job={item} />}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={60} color={theme.colors.lightGray} />
          <Text style={styles.emptyText}>Você não favoritou nenhuma vaga.</Text>
          <Text style={styles.emptySubtext}>Toque na estrela em uma vaga para salvá-la aqui.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: { padding: theme.spacing.md, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: theme.colors.secondary, textAlign: 'center', marginTop: theme.spacing.sm },
});