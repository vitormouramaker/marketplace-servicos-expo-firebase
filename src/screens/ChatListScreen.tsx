import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

interface ChatRoom {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantPhotoURLs?: { [key: string]: string | null };
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { showModal } = useModal();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const roomsRef = collection(db, 'chat_rooms');
    const q = query(roomsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const rooms: ChatRoom[] = [];
        querySnapshot.forEach((doc) => {
          rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
        });
        setChatRooms(rooms);
        setLoading(false);
      }, 
      (error) => {
        console.error("Erro no listener do ChatList:", JSON.stringify(error, null, 2));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDeleteChat = (room: ChatRoom) => {
    showModal({
      title: "Excluir Conversa",
      message: "Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.",
      buttons: [
        { 
          text: "Cancelar", 
          onPress: () => {}, 
          style: 'cancel' 
        },
        { 
          text: "Excluir", 
          style: 'destructive', 
          onPress: async () => {
            setDeletingId(room.id);
            try {
              const roomRef = doc(db, 'chat_rooms', room.id);
              await deleteDoc(roomRef);
            } catch (error) {
              console.error("Erro ao deletar a conversa:", error);
              showModal({
                title: "Erro",
                message: "Não foi possível excluir a conversa.",
                buttons: [{ text: "OK", onPress: () => {} }]
              });
            } finally {
              setDeletingId(null);
            }
          } 
        }
      ]
    });
  };

  const handleChatPress = (room: ChatRoom) => {
    if (!user || !userProfile) return;
    const recipientId = room.participants.find(p => p !== user.uid);
    const recipientName = room.participantNames[recipientId || ''];
    router.push({
      pathname: '/(app)/chat/[chatRoomId]',
      params: {
        chatRoomId: room.id,
        recipientName: recipientName,
        recipientId: recipientId,
        creatorName: userProfile.displayName,
      },
    } as any);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Minhas Mensagens', headerTintColor: theme.colors.white, headerStyle: {backgroundColor: theme.colors.primary} }} />
      <FlatList
        data={chatRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          if (!user) return null;
          const recipientId = item.participants.find(p => p !== user.uid) || '';
          const recipientName = item.participantNames[recipientId] || 'Conversa';
          const recipientPhotoURL = item.participantPhotoURLs?.[recipientId];

          return (
            <View style={styles.chatItemContainer}>
              <TouchableOpacity style={styles.chatItemTouchable} onPress={() => handleChatPress(item)}>
                <View style={styles.avatar}>
                  {recipientPhotoURL ? (
                    <Image source={{ uri: recipientPhotoURL }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                  )}
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.recipientName}>{recipientName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.colors.lightGray} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteChat(item)} disabled={deletingId === item.id}>
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <Ionicons name="trash-bin-outline" size={22} color={theme.colors.error} />
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhuma conversa encontrada.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, },
  listContainer: { padding: theme.spacing.md, },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  chatItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0bd99ff', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md, overflow: 'hidden' },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  chatInfo: { flex: 1, },
  recipientName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, },
  emptyText: { fontSize: 16, color: theme.colors.secondary, },
  deleteButton: {
    padding: theme.spacing.md,
    minWidth: 40,
    alignItems: 'center',
  },
});