// src/components/chat/ReplyContextBox.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

interface ReplyContextBoxProps {
  senderName: string;
  text?: string;
  mediaType?: 'image' | 'video' | 'file' | 'audio';
  fileName?: string;
  isMyMessage: boolean;
}

const getMediaText = (mediaType?: string, fileName?: string) => {
  if (fileName) return `📄 ${fileName}`; // Prioriza o nome do arquivo

  switch (mediaType) {
    case 'image': return '📷 Imagem';
    case 'video': return '🎥 Vídeo';
    case 'audio': return '🎵 Áudio';
    case 'file': return '📄 Documento';
    default: return '';
  }
};

export const ReplyContextBox = ({ senderName, text, mediaType, fileName, isMyMessage }: ReplyContextBoxProps) => {
  const textColor = isMyMessage ? theme.colors.white : theme.colors.text;
  const backgroundColor = isMyMessage ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)';
  const accentColor = isMyMessage ? theme.colors.white : theme.colors.primary;

  const content = text || getMediaText(mediaType, fileName);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      <View style={styles.textContainer}>
        <Text style={[styles.senderName, { color: accentColor }]}>{senderName}</Text>
        <Text style={[styles.contentText, { color: textColor }]} numberOfLines={1}>
          {content}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
    maxWidth: '100%',
  },
  accentLine: {
    width: 4,
  },
  textContainer: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  contentText: {
    fontSize: 14,
  },
});