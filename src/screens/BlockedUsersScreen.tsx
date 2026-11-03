import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export default function BlockedUsersScreen() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null); // Para feedback de loading

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      const blockedIds = userProfile?.blockedUsers || [];
      if (blockedIds.length === 0) {
        setBlockedUsers([]);
        setLoading(false);
        return;
      }
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where(documentId(), 'in', blockedIds));
      try {
        const querySnapshot = await getDocs(q);
        const usersList: UserProfile[] = [];
        querySnapshot.forEach(doc => usersList.push({ uid: doc.id, ...doc.data() } as UserProfile));
        setBlockedUsers(usersList);
      } catch (error) {
        console.error("Erro ao buscar usuários bloqueados:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userProfile) fetchBlockedUsers();
  }, [userProfile]);
  
  const handleUnblock = async (userToUnblock: UserProfile) => {
    setUnblockingId(userToUnblock.uid);
    try {
      const functions = getFunctions();
      const unblockUser = httpsCallable(functions, 'unblockUser');
      await unblockUser({ userIdToUnblock: userToUnblock.uid });
      
      showModal({
        title: "Sucesso",
        message: `${userToUnblock.displayName} foi desbloqueado.`,
        buttons: [{ text: 'OK', onPress: () => {} }]
      });

      await refreshUserProfile();
    } catch (error) {
      showModal({
        title: "Erro",
        message: "Não foi possível desbloquear o usuário.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Usuários Bloqueados' }} />
      <FlatList
        data={blockedUsers}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.userInfo}>
              <Image source={{ uri: item.photoURL }} style={styles.avatar} />
              <Text style={styles.name}>{item.displayName}</Text>
            </View>
            <Button 
              title="Desbloquear" 
              variant="secondary" 
              onPress={() => handleUnblock(item)}
              isLoading={unblockingId === item.uid}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centeredEmpty}>
            <Ionicons name="shield-checkmark-outline" size={60} color={theme.colors.lightGray} />
            <Text style={styles.emptyText}>Você não bloqueou nenhum usuário.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centeredEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  list: { padding: theme.spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: theme.spacing.md, marginBottom: theme.spacing.md, borderRadius: theme.borderRadius.md },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: theme.spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: theme.spacing.md },
  name: { fontSize: 16, fontWeight: 'bold', flexShrink: 1 },
  emptyText: { marginTop: theme.spacing.md, fontSize: 16, color: theme.colors.secondary },
});