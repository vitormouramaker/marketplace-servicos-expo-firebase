// src/components/common/modal/StandardModal.tsx

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useModal } from '../../../contexts/ModalContext';
import { theme } from '../../../styles/theme';

export const StandardModal = () => {
  const { isVisible, modalConfig, hideModal } = useModal();

  if (!isVisible || !modalConfig) {
    return null;
  }

  // Define o tipo padrão como 'alert' se não for especificado
  const { title, message, buttons, type = 'alert' } = modalConfig;

  const getButtonTextStyle = (style: 'default' | 'destructive' | 'cancel' = 'default') => {
    // Para o action-sheet, o estilo de cancelamento é diferente
    if (type === 'action-sheet' && style === 'cancel') {
      return styles.actionSheetCancelText;
    }
    switch (style) {
      case 'destructive':
        return styles.buttonTextDestructive;
      case 'cancel':
        return styles.cancelButtonText;
      default:
        return styles.buttonTextDefault;
    }
  };

  const renderAlert = () => {
    // Separa os botões de ação (ex: Apagar) do botão de cancelar
    const actionButtons = buttons.filter(b => b.style !== 'cancel');
    const cancelButton = buttons.find(b => b.style === 'cancel');

    return (
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          
          {/* Contêiner para a primeira fileira de botões (Apagar para mim / todos) */}
          <View style={styles.buttonContainer}>
            {actionButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  // Adiciona um separador se houver mais de um botão de ação
                  index > 0 && styles.buttonSeparator,
                ]}
                onPress={() => {
                  button.onPress();
                  hideModal();
                }}
              >
                <Text style={getButtonTextStyle(button.style)}>{button.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Seção separada e destacada para o botão Cancelar */}
          {cancelButton && (
            <TouchableOpacity
              style={styles.cancelButtonWrapper}
              onPress={() => {
                cancelButton.onPress();
                hideModal();
              }}
            >
              <Text style={styles.cancelButtonText}>{cancelButton.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderActionSheet = () => {
    // Separa o botão de cancelar dos outros
    const actionButtons = buttons.filter(b => b.style !== 'cancel');
    const cancelButton = buttons.find(b => b.style === 'cancel');

    return (
      <TouchableOpacity style={styles.actionSheetOverlay} activeOpacity={1} onPress={hideModal}>
        <SafeAreaView>
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>{title}</Text>
            </View>
            {actionButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionSheetButton,
                  index === actionButtons.length - 1 && styles.actionSheetButtonLast
                ]}
                onPress={() => {
                  button.onPress();
                  hideModal();
                }}
              >
                <Text style={getButtonTextStyle(button.style)}>{button.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {cancelButton && (
            <TouchableOpacity
              style={[styles.actionSheetContainer, styles.actionSheetCancelButton]}
              onPress={() => {
                cancelButton.onPress();
                hideModal();
              }}
            >
              <Text style={getButtonTextStyle(cancelButton.style)}>{cancelButton.text}</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </TouchableOpacity>
    );
  };
  
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={hideModal}
    >
      {type === 'alert' ? renderAlert() : renderActionSheet()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
  },
  buttonTextDefault: {
    fontSize: 17,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  buttonTextDestructive: {
    fontSize: 17,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  cancelButtonWrapper: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 17,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.sm,
    overflow: 'hidden',
  },
  actionSheetHeader: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionSheetTitle: {
    fontSize: 14,
    color: theme.colors.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionSheetButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionSheetButtonLast: {
    borderBottomWidth: 0,
  },
  actionSheetCancelButton: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 17,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
});