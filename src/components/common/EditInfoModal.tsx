import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardTypeOptions, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';
import { Button } from '../common/Button';

interface EditInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newValue: string) => Promise<void>;
  title: string;
  initialValue: string;
  warningMessage?: string;
  inputPrefix?: string;
  infoMessage?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const EditInfoModal = ({ 
  visible, 
  onClose, 
  onSave, 
  title, 
  initialValue, 
  warningMessage, 
  inputPrefix, 
  infoMessage,
  keyboardType = 'default',
  autoCapitalize = 'sentences'
}: EditInfoModalProps) => {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    if (value.trim() === '') {
      Alert.alert("Campo Vazio", "Por favor, preencha o campo para salvar.");
      return;
    }
    setIsLoading(true);
    await onSave(value);
    setIsLoading(false);
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
          <Text style={styles.title}>{title}</Text>
          
          {warningMessage && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
              <Text style={styles.warningText}>{warningMessage}</Text>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          <Text style={styles.label}>{`Novo ${title.toLowerCase()}`}</Text>
          <View style={styles.inputWrapper}>
            {inputPrefix && <Text style={styles.prefixText}>{inputPrefix}</Text>}
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholderTextColor={theme.colors.placeholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
            />
          </View>
          
          <Button title="Salvar Alterações" onPress={handleSave} isLoading={isLoading} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: theme.borderRadius.md, padding: theme.spacing.lg },
  closeButton: { position: 'absolute', top: 10, right: 10 },
  title: { ...theme.typography.title, textAlign: 'center', marginBottom: theme.spacing.md },
  warningContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md },
  warningText: { flex: 1, marginLeft: theme.spacing.sm, color: '#D36400' },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: '#4338ca',
  },
  label: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
  },
  prefixText: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: theme.colors.text,
  },
});