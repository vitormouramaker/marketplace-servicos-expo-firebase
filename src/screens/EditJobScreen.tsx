import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export default function EditJobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { showModal } = useModal();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      const docRef = doc(db, 'jobs', jobId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title);
        setDescription(data.description);
      }
      setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const handleSaveChanges = async () => {
    if (!title || !description) {
      showModal({
        title: "Campos Vazios",
        message: "Título e descrição não podem estar vazios.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }
    setIsSaving(true);
    try {
      const functions = getFunctions();
      const updateJob = httpsCallable(functions, 'updateJob');
      await updateJob({ jobId, title, description });
      
      showModal({
        title: "Sucesso",
        message: "Sua vaga foi atualizada.",
        buttons: [{ text: "OK", onPress: () => router.back() }]
      });

    } catch (error: any) {
      showModal({
        title: "Erro",
        message: `Não foi possível atualizar a vaga: ${error.message}`,
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Editar Vaga' }} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>Editar Informações</Text>
        <Input label="Título da Vaga" value={title} onChangeText={setTitle} />
        <Input label="Descrição Completa" value={description} onChangeText={setDescription} multiline style={{ height: 150, textAlignVertical: 'top' }} />
        <Text style={styles.infoText}>Outras opções como orçamento, categoria e duração não podem ser alteradas após a publicação.</Text>
        <Button title="Salvar Alterações" onPress={handleSaveChanges} isLoading={isSaving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: theme.spacing.lg },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: theme.spacing.lg },
  infoText: { color: theme.colors.secondary, fontStyle: 'italic', marginVertical: theme.spacing.lg, textAlign: 'center' },
});