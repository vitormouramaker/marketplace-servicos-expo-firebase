import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaskedTextInput } from "react-native-mask-text";
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Picker } from '../components/common/Picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { City, getCitiesByState, getStates, State } from '../services/locationService';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export function ProfessionalProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshUserProfile } = useAuth();
  const { showModal } = useModal();

  const [profession, setProfession] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [professions, setProfessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      getStates().then(setStates);
      try {
        const professionsQuery = await getDocs(collection(db, "professions"));
        const professionsList = professionsQuery.docs.map(doc => doc.data().name as string).sort();
        setProfessions(professionsList);
      } catch (error) {
        console.error("Erro ao buscar profissões:", error);
        showModal({
          title: "Erro de Conexão",
          message: "Não foi possível carregar a lista de profissões.",
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedState) {
      setIsLoadingCities(true);
      getCitiesByState(selectedState.id).then(setCities).finally(() => setIsLoadingCities(false));
    }
  }, [selectedState]);

  const handleStateChange = (stateName: string) => {
    const state = states.find(s => s.nome === stateName);
    setSelectedState(state || null);
    setSelectedCity(null);
    setCities([]);
  };

  const handleProfileSave = async () => {
    if (!profession || !bio || !phone || !selectedState || !selectedCity) {
      showModal({
        title: "Campos Incompletos",
        message: "Por favor, preencha todos os campos.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        profession, bio, phone,
        address: { city: selectedCity, state: selectedState.sigla },
        profileType: 'professional', profileCompleted: true,
      });
      await refreshUserProfile();
      
      showModal({
        title: "Sucesso!",
        message: "Seu perfil profissional foi salvo.",
        buttons: [{ text: 'OK', onPress: () => router.replace('/(app)/home') }]
      });

    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível salvar seu perfil.",
        buttons: [{ text: 'OK', onPress: () => {} }]
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
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="person-circle-outline" size={60} color={theme.colors.primary} />
            <Text style={styles.title}>Complete seu Perfil</Text>
            <Text style={styles.subtitle}>Adicione mais detalhes para que os clientes possam te encontrar.</Text>
          </View>
          <View style={styles.formContainer}>
            <Picker label="Sua Profissão" placeholder="Selecione sua profissão" selectedValue={profession} options={professions} onValueChange={setProfession} />
            <Picker label="Estado" placeholder="Selecione seu estado" selectedValue={selectedState?.nome || null} options={states.map(s => s.nome)} onValueChange={handleStateChange} />
            <Picker label="Cidade" placeholder={isLoadingCities ? "Carregando..." : "Selecione sua cidade"} selectedValue={selectedCity} options={cities.map(c => c.nome)} onValueChange={setSelectedCity} disabled={!selectedState || isLoadingCities} />
            
            <Text style={styles.label}>Telefone de Contato</Text>
            <MaskedTextInput
              mask="(99) 99999-9999"
              onChangeText={setPhone}
              value={phone}
              keyboardType="numeric"
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor={theme.colors.placeholder}
            />
            
            <Input label="Fale sobre seu trabalho (Bio)" value={bio} onChangeText={setBio} multiline numberOfLines={4} style={{ height: 120, textAlignVertical: 'top' }} />
            <Button title="Salvar Perfil" onPress={handleProfileSave} isLoading={isLoading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.lg },
  header: { alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.secondary, textAlign: 'center', marginTop: theme.spacing.sm },
  formContainer: { width: '100%' },
  label: { marginBottom: theme.spacing.sm, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  input: { height: 50, borderWidth: 1, borderColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.white, fontSize: 16, color: theme.colors.text, marginBottom: theme.spacing.md },
});