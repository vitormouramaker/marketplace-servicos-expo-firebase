import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Job, JobCard } from '../components/common/JobCard';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const jobsRef = collection(db, 'jobs');
    const q = query(
      jobsRef, 
      where('status', '==', 'open'),
      orderBy('isHighlighted', 'desc'),
      orderBy('postedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobsList: Job[] = [];
      querySnapshot.forEach((doc) => {
        jobsList.push({ id: doc.id, ...doc.data() } as Job);
      });
      setJobs(jobsList);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar vagas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Vagas Disponíveis' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Vagas Disponíveis' }} />
      
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} />}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Novas oportunidades</Text>
            <Text style={styles.headerSubtitle}>Veja as vagas mais recentes publicadas por outros usuários.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centeredEmpty}>
            <Ionicons name="sad-outline" size={60} color={theme.colors.lightGray} />
            <Text style={styles.emptyText}>Nenhuma vaga disponível no momento.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/create-job')}
      >
        <Ionicons name="add" size={32} color={theme.colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  centeredEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});