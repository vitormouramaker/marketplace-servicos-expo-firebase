import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Asset {
  uri: string;
  mimeType?: string;
  name?: string;
  type?: string;
}

interface MediaPreviewModalProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSend: (asset: Asset, caption: string) => void;
  isSending: boolean;
}

export const MediaPreviewModal = ({ visible, asset, onClose, onSend, isSending }: MediaPreviewModalProps) => {
  const [caption, setCaption] = useState('');

  if (!asset) {
    return null;
  }

  const handleSend = () => {
    onSend(asset, caption);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={32} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: asset.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footer}>
            <TextInput
              style={styles.input}
              placeholder="Adicionar uma legenda..."
              placeholderTextColor="#ccc"
              value={caption}
              onChangeText={setCaption}
            />
            <TouchableOpacity 
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]} 
              onPress={handleSend}
              disabled={isSending}
            >
              <Ionicons name="send" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    padding: theme.spacing.md,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    paddingHorizontal: theme.spacing.md,
    color: 'white',
    fontSize: 16,
    marginRight: theme.spacing.md,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});