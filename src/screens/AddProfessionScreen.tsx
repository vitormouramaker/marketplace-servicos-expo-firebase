import { useRouter } from 'expo-router';
import { addDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Picker } from '../components/common/Picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

const EXPERTISE_LEVELS = ['Iniciante', 'Júnior', 'Pleno', 'Sênior', 'Especialista'];

export default function AddProfessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showModal } = useModal();
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  
  const [professionsList, setProfessionsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfessions = async () => {
      try {
        const professionsQuery = await getDocs(collection(db, "professions"));
        const list = professionsQuery.docs.map(doc => doc.data().name as string).sort();
        setProfessionsList(list);
      } catch (error) {
        console.error("Erro ao buscar profissões:", error);
      }
    };
    fetchProfessions();
  }, []);

  const handleSaveProfession = async () => {
    if (!selectedProfession || !selectedLevel) {
      showModal({
        title: "Campos Incompletos",
        message: "Por favor, selecione a profissão e seu nível de expertise.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const userProfessionsRef = collection(db, 'users', user.uid, 'userProfessions');

      if (isMaster) {
        const batch = writeBatch(db);
        const querySnapshot = await getDocs(userProfessionsRef);
        querySnapshot.forEach(doc => {
          if (doc.data().isMaster) {
            batch.update(doc.ref, { isMaster: false });
          }
        });
        await batch.commit();
      }
      
      await addDoc(userProfessionsRef, {
        name: selectedProfession,
        level: selectedLevel,
        isMaster: isMaster,
      });

      showModal({
        title: "Sucesso!",
        message: "Profissão adicionada ao seu perfil.",
        buttons: [{ text: "OK", onPress: () => router.back() }]
      });

    } catch (error) {
      console.error("Erro ao salvar profissão:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível salvar a profissão.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Adicionar Profissão</Text>
        <Picker label="Profissão" placeholder="Selecione a profissão" selectedValue={selectedProfession} options={professionsList} onValueChange={setSelectedProfession} />
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

        <Button title="Salvar Profissão" onPress={handleSaveProfession} isLoading={isLoading} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  title: { ...theme.typography.title, textAlign: 'center', marginBottom: theme.spacing.xl },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: 'white', borderRadius: theme.borderRadius.md },
  switchLabel: { fontSize: 16, fontWeight: '500', color: theme.colors.text },
});