import { Ionicons } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';
import { useModal } from '../../contexts/ModalContext';
import { Button } from '../common/Button';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const CONFIRMATION_TEXT = 'EXCLUIR';

export const DeleteAccountModal = ({ visible, onClose }: DeleteAccountModalProps) => {
  const { showModal } = useModal();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isButtonDisabled = inputText !== CONFIRMATION_TEXT;

  const handleClose = () => {
    setInputText('');
    onClose();
  };

  const handleConfirmDeletion = async () => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      const deactivateAccount = httpsCallable(functions, 'deactivateAccount');
      await deactivateAccount();
      await auth.signOut();
      
      handleClose();

    } catch (error) {
      console.error("Erro ao desativar a conta:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível iniciar o processo de exclusão da conta. Tente novamente mais tarde.",
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
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Tem certeza absoluta?</Text>
          <Text style={styles.message}>
            Sua conta será desativada e agendada para exclusão em 30 dias. Após esse período, **todos os seus dados serão perdidos permanentemente**.
          </Text>
          <Text style={styles.label}>Para confirmar, digite "<Text style={styles.boldText}>{CONFIRMATION_TEXT}</Text>" abaixo:</Text>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button 
            title="Sim, excluir minha conta" 
            onPress={handleConfirmDeletion} 
            isLoading={isLoading}
            disabled={isButtonDisabled}
            variant="danger"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg },
  closeButton: { position: 'absolute', top: 10, right: 10 },
  title: { ...theme.typography.title, textAlign: 'center', marginBottom: theme.spacing.md, color: theme.colors.error },
  message: { fontSize: 15, color: theme.colors.secondary, textAlign: 'center', marginBottom: theme.spacing.lg, lineHeight: 22 },
  label: { fontSize: 14, color: theme.colors.text, marginBottom: theme.spacing.sm, textAlign: 'center' },
  boldText: { fontWeight: 'bold' },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.white,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
});