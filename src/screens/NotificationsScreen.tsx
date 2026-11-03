import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PillTabSelector } from '../components/common/PillTabSelector';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'vaga' | 'candidatura' | 'chat' | 'review' | 'sistema' | 'promocao' | 'carteira';
  link?: string;
  isRead: boolean;
  createdAt: { toDate: () => Date; };
}

const NOTIFICATION_ICONS = {
  candidatura: 'person-add-outline',
  vaga: 'briefcase-outline',
  chat: 'chatbubbles-outline',
  review: 'star-outline',
  carteira: 'wallet-outline',
  promocao: 'megaphone-outline',
  sistema: 'cog-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  useEffect(() => {
    if (!user) return;
    const notificationsRef = collection(db, "users", user.uid, "notifications");
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsList: Notification[] = [];
      snapshot.forEach(doc => {
        notificationsList.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notificationsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'read') {
      return notifications.filter(n => n.isRead);
    }
    return notifications.filter(n => !n.isRead);
  }, [notifications, activeTab]);

  const handleNotificationPress = async (item: Notification) => {
    if (!user) return;
    if (!item.isRead) {
      const notificationRef = doc(db, "users", user.uid, "notifications", item.id);
      await updateDoc(notificationRef, { isRead: true });
    }
    if (item.link) {
      router.push(item.link as any);
    }
  };
  
  const TABS = [
    { key: 'unread', title: 'Não Lidas' },
    { key: 'read', title: 'Lidas' },
  ];

  const renderNotificationCard = ({ item }: { item: Notification }) => {
  const iconName = NOTIFICATION_ICONS[item.type] || 'notifications-outline';
  const isUnread = !item.isRead;

  return (
    <TouchableOpacity 
      style={[styles.card, isUnread && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.8}
    >
      {/* Badge para não lida */}
      {isUnread && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Novo</Text>
        </View>
      )}

      <View style={styles.textContainer}>
        {/* Cabeçalho com ícone + título */}
        <View style={styles.headerRow}>
          <Ionicons name={iconName as any} size={20} color={theme.colors.primary} style={styles.headerIcon} />
          <Text style={styles.title}>{item.title}</Text>
        </View>

        {/* Linha divisória */}
        <View style={styles.divider} />

        <Text style={styles.body}>{item.body}</Text>

        {/* Linha divisória */}
        <View style={styles.divider} />

        <Text style={styles.date}>
          {item.createdAt.toDate().toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Notificações" }} />

      <PillTabSelector 
        tabs={TABS}
        activeTab={activeTab}
        onTabPress={(key) => setActiveTab(key as 'unread' | 'read')}
      />

      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="notifications-off-outline" 
                size={60} 
                color={theme.colors.lightGray} 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'unread' 
                  ? 'Nenhuma notificação nova.' 
                  : 'Nenhuma notificação para exibir.'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  list: { 
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  card: { 
    backgroundColor: 'white', 
    padding: theme.spacing.md, 
    marginBottom: theme.spacing.md, 
    borderRadius: theme.borderRadius.lg, 
    position: 'relative',
    borderColor: '#fff2d6ff',
    borderWidth: 1,
  },
  unreadCard: { 
    borderWidth: 1,
    borderColor: theme.colors.primary,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    color: theme.colors.white,
    fontWeight: '600',
  },
  unreadBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: theme.colors.primary,
  },
  iconContainer: { 
    marginRight: theme.spacing.md, 
    marginTop: 2,
  },
  textContainer: { flex: 1 },
  title: { 
    fontWeight: '700', 
    fontSize: 16, 
    color: theme.colors.text,
    flexShrink: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcon: {
    marginRight: 8,
  },
  body: { 
    fontSize: 14, 
    color: theme.colors.secondary, 
    marginVertical: 6,
    lineHeight: 20,
  },
  date: { 
    fontSize: 12, 
    color: theme.colors.lightGray, 
    marginTop: 6,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyText: { 
    marginTop: theme.spacing.md, 
    fontSize: 16, 
    color: theme.colors.secondary 
  },
});
