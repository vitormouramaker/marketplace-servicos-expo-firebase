import { Ionicons } from '@expo/vector-icons';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';
import { Job, JobCard } from '../common/JobCard';

export const AppliedJobsTab = () => {
  const { userProfile } = useAuth();
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppliedJobs = async () => {
      const appliedIds = userProfile?.appliedJobs || [];

      if (appliedIds.length === 0) {
        setLoading(false);
        setAppliedJobs([]);
        return;
      }

      const jobsRef = collection(db, 'jobs');
      const q = query(jobsRef, where(documentId(), 'in', appliedIds));
      
      try {
        const querySnapshot = await getDocs(q);
        const jobsList: Job[] = [];
        querySnapshot.forEach(doc => {
          jobsList.push({ id: doc.id, ...doc.data() } as Job);
        });
        setAppliedJobs(jobsList);
      } catch (error) {
        console.error("Erro ao buscar vagas aplicadas:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchAppliedJobs();
    }
  }, [userProfile]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <FlatList
      data={appliedJobs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <JobCard job={item} />}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color={theme.colors.lightGray} />
          <Text style={styles.emptyText}>Você ainda não se candidatou a nenhuma vaga.</Text>
          <Text style={styles.emptySubtext}>Explore as vagas e encontre sua próxima oportunidade.</Text>
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