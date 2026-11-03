import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface ReplyPreviewProps {
  senderName: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'file' | 'audio';
  fileName?: string;
  onCancel: () => void;
}

const getMediaText = (mediaType?: string, fileName?: string) => {
    if (fileName) return `📄 ${fileName}`;

    switch (mediaType) {
      case 'image': return '📷 Imagem';
      case 'video': return '🎥 Vídeo';
      case 'audio': return '🎵 Áudio';
      case 'file': return '📄 Documento';
      default: return '';
    }
};

export const ReplyPreview = ({ senderName, text, mediaType, fileName, onCancel }: ReplyPreviewProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.name}>Respondendo a {senderName}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {text || getMediaText(mediaType, fileName)}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close-circle" size={24} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      backgroundColor: '#fafafa',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: '#e0e0e0',
      marginBottom: theme.spacing.xs,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    line: {
      width: 4,
      backgroundColor: theme.colors.primary,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    textContainer: {
      flex: 1,
      paddingLeft: theme.spacing.sm,
    },
    name: {
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    message: {
      color: theme.colors.secondary,
      paddingVertical: 2,
    },
    closeButton: {
      paddingLeft: theme.spacing.sm,
    },
});