import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface PickerProps {
  label: string;
  placeholder: string;
  selectedValue: string | null;
  options: string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const Picker = ({ label, placeholder, selectedValue, options, onValueChange, disabled = false }: PickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = (item: string) => {
    onValueChange(item);
    setModalVisible(false);
    setSearchTerm('');
  };

  const handleSuggest = () => {
    setModalVisible(false);
    router.push('/(app)/suggest-profession');
  };

  const openModal = () => {
    if (!disabled) setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerButton, disabled && styles.disabled]}
        onPress={openModal}
        disabled={disabled}
      >
        <Text style={[styles.pickerText, !selectedValue && styles.placeholderText]}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.touchableOverlay} onPress={() => setModalVisible(false)} activeOpacity={1} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar..."
                placeholderTextColor={theme.colors.placeholder}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {label === 'Sua Profissão' && (
              <TouchableOpacity style={styles.suggestOption} onPress={handleSuggest}>
                <Text style={styles.suggestText}>Não encontrou sua profissão? Sugira uma</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.option} onPress={() => handleSelect(item)}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum resultado encontrado</Text>}
            />
            <SafeAreaView style={styles.bottomSafeArea} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: theme.spacing.md },
  label: { marginBottom: theme.spacing.sm, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  pickerButton: { height: 50, borderWidth: 1, borderColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disabled: { backgroundColor: '#e0bd99ff', opacity: 0.7 },
  pickerText: { fontSize: 16, color: theme.colors.text },
  placeholderText: { color: theme.colors.placeholder },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  touchableOverlay: { flex: 1 },
  modalContent: { width: '100%', maxHeight: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: theme.borderRadius.md, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  option: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  optionText: { fontSize: 16, textAlign: 'left' },
  emptyText: { textAlign: 'center', padding: theme.spacing.lg, color: theme.colors.secondary },
  suggestOption: { padding: theme.spacing.md, alignItems: 'center', backgroundColor: '#e0bd99ff', marginHorizontal: theme.spacing.lg, borderRadius: theme.borderRadius.md },
  suggestText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 15 },
  bottomSafeArea: { backgroundColor: 'white' },
});