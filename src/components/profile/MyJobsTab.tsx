import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';
import { Job, JobCard } from '../common/JobCard';

export const MyJobsTab = () => {
  const { user } = useAuth();
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, where('postedByUid', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList: Job[] = [];
      snapshot.forEach(doc => jobsList.push({ id: doc.id, ...doc.data() } as Job));
      setMyJobs(jobsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <FlatList
      data={myJobs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <JobCard job={item} />}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Você ainda não publicou nenhuma vaga.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: { padding: theme.spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: theme.colors.secondary },
});