import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

interface Applicant {
  id: string; // O UID do profissional
  applicantName: string;
  applicantPhotoURL?: string | null;
  applicantHeadline: string;
  coverLetter?: string;
}

export default function ApplicantsScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { userProfile } = useAuth();
  
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    const applicantsRef = collection(db, 'jobs', jobId, 'applicants');
    const q = query(applicantsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appList: Applicant[] = [];
      snapshot.forEach(doc => {
        appList.push({ id: doc.id, ...doc.data() } as Applicant);
      });
      setApplicants(appList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [jobId]);

  const handleStartChat = (applicant: Applicant) => {
    if (!userProfile) return;
    const uids = [userProfile.uid, applicant.id].sort();
    const chatRoomId = uids.join('_');

    router.push({
      pathname: '/chat/[chatRoomId]',
      params: { 
        chatRoomId,
        recipientId: applicant.id,
        recipientName: applicant.applicantName,
        creatorName: userProfile.displayName,
      },
    });
  };

  const renderApplicantCard = ({ item }: { item: Applicant }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {item.applicantPhotoURL ? (
            <Image source={{ uri: item.applicantPhotoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={theme.colors.primary} />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.applicantName}>{item.applicantName}</Text>
          <Text style={styles.applicantHeadline}>{item.applicantHeadline}</Text>
        </View>
      </View>
      {item.coverLetter && (
        <Text style={styles.coverLetter}>{item.coverLetter}</Text>
      )}
      <TouchableOpacity style={styles.chatButton} onPress={() => handleStartChat(item)}>
        <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.white} />
        <Text style={styles.chatButtonText}>Iniciar Conversa</Text>
      </TouchableOpacity>
    </View>
  );
  
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Candidatos à Vaga' }} />
      <FlatList
        data={applicants}
        keyExtractor={(item) => item.id}
        renderItem={renderApplicantCard}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.headerTitle}>Profissionais Interessados</Text>}
        ListEmptyComponent={
          <View style={styles.centeredEmpty}>
            <Ionicons name="people-outline" size={60} color={theme.colors.lightGray} />
            <Text style={styles.emptyText}>Nenhum candidato até o momento.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  listContainer: { padding: theme.spacing.lg },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: theme.spacing.lg, textAlign: 'center' },
  emptyText: { fontSize: 16, color: theme.colors.secondary, marginTop: theme.spacing.md },
  card: { backgroundColor: 'white', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: '#f0f0f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0bd99ff', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  headerText: { flex: 1 },
  applicantName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  applicantHeadline: { fontSize: 14, color: theme.colors.secondary },
  coverLetter: { fontSize: 15, color: theme.colors.text, fontStyle: 'italic', marginVertical: theme.spacing.md, padding: theme.spacing.md, backgroundColor: '#f8f9fa', borderRadius: theme.borderRadius.sm },
  chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.md },
  chatButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: theme.spacing.sm },
});