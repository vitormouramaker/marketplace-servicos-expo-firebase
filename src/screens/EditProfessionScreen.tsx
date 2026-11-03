import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Picker } from '../components/common/Picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

const EXPERTISE_LEVELS = ['Iniciante', 'Júnior', 'Pleno', 'Sênior', 'Especialista'];

export default function EditProfessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showModal } = useModal();
  const params = useLocalSearchParams<{ professionId: string, name: string, level: string, isMaster: string }>();
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(params.level || null);
  const [isMaster, setIsMaster] = useState(params.isMaster === 'true');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfession = async () => {
    if (!selectedLevel) {
      showModal({
        title: "Campo Incompleto",
        message: "Por favor, selecione seu nível de expertise.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }
    if (!user || !params.professionId) return;

    setIsLoading(true);
    try {
      const userProfessionsRef = collection(db, 'users', user.uid, 'userProfessions');
      const professionDocRef = doc(userProfessionsRef, params.professionId);

      if (isMaster) {
        const batch = writeBatch(db);
        const querySnapshot = await getDocs(userProfessionsRef);
        querySnapshot.forEach(doc => {
          if (doc.id !== params.professionId && doc.data().isMaster) {
            batch.update(doc.ref, { isMaster: false });
          }
        });
        await batch.commit();
      }
      
      await updateDoc(professionDocRef, {
        level: selectedLevel,
        isMaster: isMaster,
      });

      showModal({
        title: "Sucesso!",
        message: "Profissão atualizada.",
        buttons: [{ text: "OK", onPress: () => router.back() }]
      });

    } catch (error) {
      console.error("Erro ao atualizar profissão:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível atualizar a profissão.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Editar Profissão</Text>
        <Text style={styles.professionName}>{params.name}</Text>
        
        <Picker label="Nível de Expertise" placeholder="Selecione seu nível" selectedValue={selectedLevel} options={EXPERTISE_LEVELS} onValueChange={setSelectedLevel} />
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Definir como Profissão MASTER?</Text>
          <Switch
            trackColor={{ false: "#767577", true: theme.colors.secondary }}
            thumbColor={isMaster ? theme.colors.primary : "#f4f3f4"}
            onValueChange={setIsMaster}
            value={isMaster}
          />
        </View>

        <Button title="Salvar Alterações" onPress={handleUpdateProfession} isLoading={isLoading} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  title: { ...theme.typography.title, textAlign: 'center' },
  professionName: { fontSize: 20, color: theme.colors.secondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: 'white', borderRadius: theme.borderRadius.md },
  switchLabel: { fontSize: 16, fontWeight: '500', color: theme.colors.text },
});