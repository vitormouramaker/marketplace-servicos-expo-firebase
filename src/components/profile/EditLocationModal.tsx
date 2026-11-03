import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebaseConfig';
import { City, getCitiesByState, getStates, State } from '../../services/locationService';
import { theme } from '../../styles/theme';
import { Button } from '../common/Button';
import { Picker } from '../common/Picker';
import { useModal } from '../../contexts/ModalContext';

interface EditLocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditLocationModal = ({ visible, onClose }: EditLocationModalProps) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [isLoading, setIsLoading] = useState(false);

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    // Busca todos os estados quando o modal é aberto
    getStates().then(setStates);
  }, []);

  useEffect(() => {
    // Busca as cidades sempre que um estado é selecionado
    if (selectedState) {
      setIsLoadingCities(true);
      getCitiesByState(selectedState.id).then(setCities).finally(() => setIsLoadingCities(false));
    }
  }, [selectedState]);

  const handleStateChange = (stateName: string) => {
    const state = states.find(s => s.nome === stateName);
    setSelectedState(state || null);
    setSelectedCity(null); // Reseta a cidade ao trocar de estado
    setCities([]);
  };

  const handleSaveLocation = async () => {
    if (!selectedState || !selectedCity) {
      showModal({
        title: "Seleção Incompleta",
        message: "Por favor, selecione um estado e uma cidade.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        address: {
          city: selectedCity,
          state: selectedState.sigla,
        },
      });

      await refreshUserProfile();
      showModal({
        title: "Sucesso!",
        message: "Sua localização foi atualizada.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      onClose(); // Fecha o modal após salvar

    } catch (error) {
      console.error("Erro ao salvar localização:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível salvar sua localização.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Alterar Localização</Text>

          <Picker 
            label="Estado" 
            placeholder="Selecione seu estado" 
            selectedValue={selectedState?.nome || null} 
            options={states.map(s => s.nome)} 
            onValueChange={handleStateChange} 
          />
          <Picker 
            label="Cidade" 
            placeholder={isLoadingCities ? "Carregando..." : "Selecione sua cidade"} 
            selectedValue={selectedCity} 
            options={cities.map(c => c.nome)} 
            onValueChange={setSelectedCity} 
            disabled={!selectedState || isLoadingCities} 
          />
          
          <View style={{ marginTop: theme.spacing.md }}>
            <Button title="Salvar Alterações" onPress={handleSaveLocation} isLoading={isLoading} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg },
  closeButton: { position: 'absolute', top: 10, right: 10 },
  title: { ...theme.typography.title, textAlign: 'center', marginBottom: theme.spacing.lg },
});