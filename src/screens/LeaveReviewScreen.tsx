import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export default function LeaveReviewScreen() {
  const router = useRouter();
  const { userId, userName, reviewId, initialRating, initialComment } = useLocalSearchParams<{ 
    userId: string, 
    userName: string,
    reviewId?: string,
    initialRating?: string,
    initialComment?: string,
  }>();
  const { userProfile } = useAuth();
  const { showModal } = useModal();

  const isEditing = !!reviewId;

  const [rating, setRating] = useState(initialRating ? parseInt(initialRating, 10) : 0);
  const [comment, setComment] = useState(initialComment || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendReview = async () => {
    if (rating === 0 || !comment) {
      showModal({
        title: "Avaliação Incompleta",
        message: "Por favor, selecione uma nota e escreva um comentário.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }
    if (!userId || !userProfile) return;

    setIsLoading(true);
    try {
      if (isEditing) {
        const reviewRef = doc(db, 'users', userId, 'reviews', reviewId);
        await updateDoc(reviewRef, {
          rating,
          comment,
        });
        showModal({
          title: "Sucesso!",
          message: "Sua avaliação foi atualizada.",
          buttons: [{ text: "OK", onPress: () => router.back() }]
        });
      } else {
        const reviewsCollection = collection(db, 'users', userId, 'reviews');
        await addDoc(reviewsCollection, {
          rating,
          comment,
          reviewerId: userProfile.uid,
          reviewerName: userProfile.displayName,
          createdAt: serverTimestamp(),
        });
        showModal({
          title: "Obrigado!",
          message: "Sua avaliação foi enviada com sucesso.",
          buttons: [{ text: "OK", onPress: () => router.back() }]
        });
      }
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível salvar sua avaliação.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{isEditing ? `Editar Avaliação para ${userName}` : `Avaliar ${userName}`}</Text>
          <Text style={styles.subtitle}>Sua opinião é muito importante!</Text>
          
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"} 
                  size={40} 
                  color="#F38001" 
                />
              </TouchableOpacity>
            ))}
          </View>

          <Input 
            label="Seu Comentário" 
            value={comment} 
            onChangeText={setComment} 
            multiline 
            numberOfLines={6} 
            style={{ height: 150, textAlignVertical: 'top' }}
          />
          <Button title={isEditing ? "Salvar Alterações" : "Enviar Avaliação"} onPress={handleSendReview} isLoading={isLoading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  title: { ...theme.typography.title, textAlign: 'center' },
  subtitle: { ...theme.typography.body, textAlign: 'center', color: theme.colors.secondary, marginBottom: theme.spacing.xl },
  starContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: theme.spacing.lg },
});