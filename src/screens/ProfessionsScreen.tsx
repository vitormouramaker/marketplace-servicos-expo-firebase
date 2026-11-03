import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { BecomeProfessionalCard } from '../components/profile/BecomeProfessionalCard';
import { useModal } from '../contexts/ModalContext';

export interface UserProfession {
  id: string;
  name: string;
  level: 'Iniciante' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista';
  isMaster: boolean;
}

export default function ProfessionsScreen() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { showModal } = useModal();
  const [professions, setProfessions] = useState<UserProfession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userProfile?.profileType === 'contractor') {
      setLoading(false);
      return;
    }

    const professionsRef = collection(db, 'users', user.uid, 'userProfessions');
    const q = query(professionsRef, orderBy('isMaster', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userProfessions: UserProfession[] = [];
      querySnapshot.forEach((doc) => {
        userProfessions.push({ id: doc.id, ...doc.data() } as UserProfession);
      });
      setProfessions(userProfessions);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, userProfile]);

  const handleEdit = (profession: UserProfession) => {
    router.push({
      pathname: '/edit-profession/[professionId]',
      params: { 
        professionId: profession.id,
        name: profession.name,
        level: profession.level,
        isMaster: profession.isMaster.toString(),
      },
    });
  };

  const handleDelete = (profession: UserProfession) => {
    showModal({
      title: "Excluir Profissão",
      message: `Tem certeza que deseja excluir a profissão "${profession.name}"?`,
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => {} },
        { 
          text: "Excluir", 
          style: "destructive", 
          onPress: async () => {
            if (!user) return;
            const docRef = doc(db, 'users', user.uid, 'userProfessions', profession.id);
            await deleteDoc(docRef);
          } 
        }
      ]
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />;
  }
  
  if (userProfile?.profileType === 'contractor') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Minhas Profissões' }} />
        <BecomeProfessionalCard />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Minhas Profissões' }} />
      <FlatList
        data={professions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-profession')}>
            <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Adicionar Nova Profissão</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <View style={[styles.professionCard, item.isMaster && styles.masterCard]}>
            {item.isMaster && (
              <View style={styles.masterBadge}>
                <MaterialCommunityIcons name="crown" size={16} color="#F38001" />
                <Text style={styles.masterText}>MASTER</Text>
              </View>
            )}
            <View style={styles.professionInfo}>
              <Text style={item.isMaster ? styles.professionNameMaster : styles.professionName}>{item.name}</Text>
              <Text style={item.isMaster ? styles.professionLevelMaster : styles.professionLevel}>{item.level}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton}>
                <Ionicons name="pencil" size={22} color={item.isMaster ? '#ffeedbff' : theme.colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconButton}>
                <Ionicons name="trash-bin" size={22} color={item.isMaster ? '#b40000ff' : theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Você não adicionou nenhuma profissão.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  listContainer: { padding: theme.spacing.lg },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe7ceff', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.lg },
  addButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16, marginLeft: theme.spacing.sm },
  professionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: '#ffe5caff' },
  masterCard: { backgroundColor: '#F38001' },
  professionInfo: { flex: 1 },
  masterBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#471276', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 15 },
  masterText: { color: '#F38001', fontSize: 12, fontWeight: 'bold', marginLeft: 5, letterSpacing: 1 },
  professionName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  professionLevel: { fontSize: 14, color: theme.colors.secondary, marginTop: 4 },
  professionNameMaster: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  professionLevelMaster: { fontSize: 14, color: '#ccc', marginTop: 4 },
  actionButtons: { flexDirection: 'row' },
  iconButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: theme.colors.secondary, fontSize: 16 },
});