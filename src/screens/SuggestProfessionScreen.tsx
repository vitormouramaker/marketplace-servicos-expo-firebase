import { useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export function SuggestProfessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showModal } = useModal();
  const [professionName, setProfessionName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSuggestionSubmit = async () => {
    if (!professionName || !description) {
      showModal({
        title: "Campos Incompletos",
        message: "Por favor, preencha o nome e a descrição da profissão.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "profession_suggestions"), {
        suggestedName: professionName,
        description: description,
        submittedBy: user?.uid,
        status: 'pending',
        createdAt: new Date(),
      });

      showModal({
        title: "Obrigado pela sua sugestão!",
        message: "Analisaremos sua proposta e, se aprovada, ela aparecerá na lista em breve.",
        buttons: [{ text: "OK", onPress: () => router.back() }]
      });

    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível enviar sua sugestão. Tente novamente.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sugerir Profissão</Text>
        <Text style={styles.subtitle}>
          Não encontrou o que procurava? Ajude-nos a expandir nossa lista!
        </Text>
        <Input label="Nome da Profissão" value={professionName} onChangeText={setProfessionName} placeholder="Ex: Especialista em IA" />
        <Input label="O que este profissional faz?" value={description} onChangeText={setDescription} multiline numberOfLines={5} style={{ height: 140, textAlignVertical: 'top' }} />
        <Button title="Enviar Sugestão" onPress={handleSuggestionSubmit} isLoading={isLoading} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  title: { ...theme.typography.title, textAlign: 'center', color: theme.colors.text },
  subtitle: { ...theme.typography.body, textAlign: 'center', color: theme.colors.secondary, marginVertical: theme.spacing.lg },
});