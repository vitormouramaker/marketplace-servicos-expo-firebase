import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { uploadPortfolioImage } from '../services/storageService';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

interface PortfolioItem {
  id: string;
  imageURL: string;
}

export default function PortfolioScreen() {
  const { user } = useAuth();
  const { showModal } = useModal();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
    const q = query(portfolioRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PortfolioItem[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as PortfolioItem));
      setPortfolio(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showModal({
        title: "Permissão Necessária",
        message: "É preciso permitir o acesso à sua galeria.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !user) return;

    setIsUploading(true);
    try {
      const { uri } = result.assets[0];
      const downloadURL = await uploadPortfolioImage(uri, user.uid);
      
      const portfolioRef = collection(db, 'users', user.uid, 'portfolio');
      await addDoc(portfolioRef, {
        imageURL: downloadURL,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      showModal({
        title: "Erro",
        message: "Não foi possível adicionar a imagem ao portfólio.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = (item: PortfolioItem) => {
    if (!user) return;
    showModal({
      title: "Excluir Imagem",
      message: "Tem certeza que deseja remover esta imagem do seu portfólio?",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => {} },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            const docRef = doc(db, 'users', user.uid, 'portfolio', item.id);
            await deleteDoc(docRef);
          },
        },
      ]
    });
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Meu Portfólio' }} />
      <FlatList
        data={portfolio}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addButton} onPress={handleAddImage} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>Adicionar Nova Imagem</Text>
              </>
            )}
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.imageURL }} style={styles.image} />
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteImage(item)}>
              <Ionicons name="trash-bin" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={60} color={theme.colors.lightGray} />
            <Text style={styles.emptyText}>Seu portfólio está vazio.</Text>
            <Text style={styles.emptySubtext}>Adicione imagens para mostrar seu trabalho.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: theme.spacing.md },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe5caff', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  addButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16, marginLeft: theme.spacing.sm },
  imageContainer: { flex: 1 / 3, aspectRatio: 1, padding: 2 },
  image: { width: '100%', height: '100%', borderRadius: theme.borderRadius.sm },
  deleteButton: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, padding: theme.spacing.lg },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.secondary, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: theme.colors.secondary, textAlign: 'center', marginTop: theme.spacing.sm },
});