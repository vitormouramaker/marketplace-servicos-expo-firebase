import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../styles/theme';

interface Props {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export const PaymentWebViewModal = ({ visible, url, onClose }: Props) => {
  if (!visible || !url) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Finalizar Pagamento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: url }}
            startInLoadingState={true}
            renderLoading={() => (
              <ActivityIndicator 
                color={theme.colors.primary} 
                size="large" 
                style={styles.loadingIndicator}
              />
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md - 4,
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
  },
});