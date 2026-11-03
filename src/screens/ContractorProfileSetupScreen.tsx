import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaskedTextInput } from 'react-native-mask-text';
import { Button } from '../components/common/Button';
import { Picker } from '../components/common/Picker';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { City, getCitiesByState, getStates, State } from '../services/locationService';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export function ContractorProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    getStates().then(setStates);
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
    if (!phone || !selectedState || !selectedCity) {
      showModal({
        title: "Campos Incompletos",
        message: "Por favor, preencha todos os campos para continuar.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        phone,
        address: {
          city: selectedCity,
          state: selectedState.sigla,
        },
        profileType: 'contractor',
        profileCompleted: true,
      });

      await refreshUserProfile();
      
      showModal({
        title: "Tudo Pronto!",
        message: "Seu perfil foi configurado. Comece a explorar!",
        buttons: [{ text: 'OK', onPress: () => router.replace('/(app)/home') }]
      });

    } catch (error) {
      console.error("Erro ao salvar perfil de contratante:", error);
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="search-circle-outline" size={80} color={theme.colors.primary} />
          <Text style={styles.title}>Complete seu Perfil</Text>
          <Text style={styles.subtitle}>
            Precisamos de algumas informações para que os profissionais possam te contatar.
          </Text>
        </View>
        <View style={styles.formContainer}>
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
          <Picker label="Estado" placeholder="Selecione seu estado" selectedValue={selectedState?.nome || null} options={states.map(s => s.nome)} onValueChange={handleStateChange} />
          <Picker label="Cidade" placeholder={isLoadingCities ? "Carregando..." : "Selecione sua cidade"} selectedValue={selectedCity} options={cities.map(c => c.nome)} onValueChange={setSelectedCity} disabled={!selectedState || isLoadingCities} />
          
          <Button title="Confirmar e Começar a Explorar" onPress={handleProfileSave} isLoading={isLoading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  title: { ...theme.typography.title, textAlign: 'center', color: theme.colors.text, marginTop: theme.spacing.lg },
  subtitle: { ...theme.typography.body, textAlign: 'center', color: theme.colors.secondary, marginTop: theme.spacing.sm },
  formContainer: { width: '100%' },
  label: { marginBottom: theme.spacing.sm, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  input: { height: 50, borderWidth: 1, borderColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.white, fontSize: 16, color: theme.colors.text, marginBottom: theme.spacing.md },
});