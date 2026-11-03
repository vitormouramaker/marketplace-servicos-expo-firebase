import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { ResizeMode, Video, VideoFullscreenUpdate } from 'expo-av';

import { theme } from '../../styles/theme';
import { ReplyContextBox } from './ReplyContextBox';
import { AudioPlayer } from './AudioPlayer';
import { formatBytes, formatDuration, formatTimestamp, getFileExtension } from '../../utils/formatters';

// Interfaces
interface Message {
  id: string;
  createdAt: any;
  senderId: string;
  text?: string;
  mediaURL?: string;
  mediaType?: 'image' | 'video' | 'file' | 'audio';
  fileName?: string;
  durationMillis?: number | null;
  fileSize?: number | null;
  replyTo?: {
    messageId: string;
    senderName: string;
    text?: string;
    mediaType?: 'image' | 'video' | 'file' | 'audio';
    fileName?: string;
  };
  deletedForAll?: boolean;
  deletedFor?: string[];
}

interface MessageItemProps {
  item: Message;
  isMyMessage: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  highlightedMessageId: string | null;
  highlightAnim: Animated.Value;
  currentUserId?: string;
  onPress: (item: Message) => void;
  onLongPress: (item: Message) => void;
  onSwipeToReply: (message: Message) => void;
  onViewImage: (url: string) => void;
  onReplyPress: (messageId: string) => void;
  isInteractionDisabled: boolean;
}

// Componente
const MessageItemComponent = (props: MessageItemProps) => {
  const {
    item, isMyMessage, isSelected, isSelectionMode,
    highlightedMessageId, highlightAnim, currentUserId, onPress,
    onLongPress, onSwipeToReply, onViewImage, onReplyPress, isInteractionDisabled
  } = props;
  
  const swipeableRef = useRef<Swipeable>(null);
  const videoRef = useRef<Video>(null);

  const isDeletedForMe = item.deletedFor?.includes(currentUserId || '');

  if (item.deletedForAll) {
    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage, styles.deletedBubble]}>
        <Ionicons name="ban-outline" size={16} color={isMyMessage ? '#ffffff80' : '#888'} style={{ marginRight: 5 }}/>
        <Text style={styles.deletedText}>Esta mensagem foi apagada para todos neste chat</Text>
      </View>
    );
  }

  if (isDeletedForMe) {
    return (
      <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage, styles.deletedBubble]}>
        <Ionicons name="trash-outline" size={16} color={isMyMessage ? '#ffffff80' : '#888'} style={{ marginRight: 5 }}/>
        <Text style={styles.deletedText}>Esta mensagem foi apagada apenas para você</Text>
      </View>
    );
  }

  const hasMedia = !!item.mediaURL;
  const hasText = !!item.text;
  const timestamp = formatTimestamp(item.createdAt);

  const handleInternalPress = () => onPress(item);
  const handleInternalLongPress = () => onLongPress(item);
  const handleInternalSwipeToReply = () => {
    onSwipeToReply(item);
    swipeableRef.current?.close();
  };

  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: 'clamp' });
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <View style={styles.replyActionContainer}>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <Ionicons name="arrow-undo" size={28} color={theme.colors.primary} />
        </Animated.View>
      </View>
    );
  };

  const renderMedia = () => {
    if (!item.mediaURL) return null;
    switch (item.mediaType) {
      case 'image':
        return (
          <TouchableOpacity onPress={() => !isSelectionMode && onViewImage(item.mediaURL!)} disabled={isSelectionMode}>
            <Image source={{ uri: item.mediaURL }} style={styles.mediaImage} />
          </TouchableOpacity>
        );
      case 'video':
        return (
          <TouchableOpacity onPress={() => !isSelectionMode && videoRef.current?.presentFullscreenPlayer()} disabled={isSelectionMode}>
            <Video
              ref={videoRef}
              source={{ uri: item.mediaURL }}
              style={styles.mediaVideo}
              useNativeControls={false}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              onFullscreenUpdate={({ fullscreenUpdate }) => {
                if (fullscreenUpdate === VideoFullscreenUpdate.PLAYER_DID_DISMISS) {
                  videoRef.current?.pauseAsync();
                }
              }}
            />
            <View style={styles.mediaOverlay}>
              <Ionicons name="play" size={40} color="white" style={styles.playIcon} />
              <View style={styles.videoInfoContainer}>
                {item.durationMillis != null && <Text style={styles.videoInfoText}>{formatDuration(item.durationMillis)}</Text>}
                {item.fileSize != null && <Text style={styles.videoInfoText}>{formatBytes(item.fileSize)}</Text>}
              </View>
            </View>
          </TouchableOpacity>
        );
      case 'file': {
        const extension = getFileExtension(item.fileName);
        const metaColor = isMyMessage ? '#ffffffb3' : '#8e8e93';
        return (
          <TouchableOpacity style={styles.fileContainer} onPress={() => !isSelectionMode && Linking.openURL(item.mediaURL!)} disabled={isSelectionMode}>
            <Ionicons name="document-text-outline" size={40} color={isMyMessage ? 'white' : theme.colors.primary} />
            <View style={styles.fileTextContainer}>
              <Text style={[isMyMessage ? styles.myMessageText : styles.theirMessageText, styles.fileName]} numberOfLines={3}>
                {item.fileName || 'Documento'}
              </Text>
              <Text style={[styles.fileMetaText, { color: metaColor }]}>
                {extension} {item.fileSize != null && `• ${formatBytes(item.fileSize)}`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }
      case 'audio':
        return <AudioPlayer uri={item.mediaURL!} isMyMessage={isMyMessage} durationMillis={item.durationMillis} />;
      default:
        return null;
    }
  };

  const highlightBackgroundColor = highlightAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', '#FFD70040'] });

  return (
    <TouchableOpacity onPress={handleInternalPress} onLongPress={handleInternalLongPress} activeOpacity={0.8} disabled={isInteractionDisabled}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={handleInternalSwipeToReply}
        friction={2}
        leftThreshold={40}
        enabled={!isSelectionMode && !isInteractionDisabled}
      >
        <Animated.View style={[item.id === highlightedMessageId && { backgroundColor: highlightBackgroundColor }, isSelected && styles.selectedOverlay]}>
          <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage, hasMedia && styles.messageBubbleWithMedia, isMyMessage && hasMedia && styles.myMessageWithMedia, !isMyMessage && hasMedia && styles.theirMessageWithMedia]}>
            <View style={hasMedia ? styles.mediaContentContainer : { paddingBottom: 15 }}>
              {item.replyTo && (
                <TouchableOpacity onPress={() => !isSelectionMode && onReplyPress(item.replyTo!.messageId)} disabled={isSelectionMode}>
                  <ReplyContextBox
                    senderName={item.replyTo.senderName}
                    text={item.replyTo.text}
                    mediaType={item.replyTo.mediaType}
                    fileName={item.replyTo.fileName}
                    isMyMessage={isMyMessage}
                  />
                </TouchableOpacity>
              )}
              {hasMedia && renderMedia()}
              {hasText && (
                <Text style={[isMyMessage ? styles.myMessageText : styles.theirMessageText, hasMedia && styles.captionText]}>
                  {item.text}
                </Text>
              )}
            </View>
            <View style={styles.timestampContainer}>
              <Text style={isMyMessage ? styles.myTimestamp : styles.theirTimestamp}>{timestamp}</Text>
            </View>
          </View>
        </Animated.View>
      </Swipeable>
    </TouchableOpacity>
  );
};

export const MessageItem = React.memo(MessageItemComponent);

const styles = StyleSheet.create({
  messageBubble: { maxWidth: '80%', padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.sm, position: 'relative' },
  myMessage: { backgroundColor: theme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: theme.borderRadius.sm },
  theirMessage: { backgroundColor: theme.colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: '#e0e0e0' },
  deletedBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0' },
  deletedText: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  myMessageText: { fontSize: 16, color: theme.colors.white },
  theirMessageText: { fontSize: 16, color: theme.colors.text },
  timestampContainer: { position: 'absolute', bottom: 4, right: 10 },
  myTimestamp: { fontSize: 11, color: '#ffffff99' },
  theirTimestamp: { fontSize: 11, color: '#00000080' },
  messageBubbleWithMedia: { padding: 0, overflow: 'hidden' },
  myMessageWithMedia: { backgroundColor: theme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: theme.borderRadius.sm },
  theirMessageWithMedia: { backgroundColor: theme.colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: theme.borderRadius.sm },
  mediaContentContainer: { paddingTop: 4, paddingHorizontal: 4, paddingBottom: theme.spacing.sm },
  mediaImage: { width: 250, height: 250, borderRadius: theme.borderRadius.md },
  mediaVideo: { width: 250, height: 250, borderRadius: theme.borderRadius.md, backgroundColor: '#000' },
  captionText: { marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, paddingBottom: 15 },
  mediaOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: theme.borderRadius.md },
  playIcon: { textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  videoInfoContainer: { position: 'absolute', bottom: 5, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' },
  videoInfoText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginRight: 8 },
  fileContainer: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm, minWidth: 180, },
  fileTextContainer: { flex: 1, marginLeft: theme.spacing.sm, justifyContent: 'center' },
  fileName: { fontWeight: '500', marginBottom: 2 },
  fileMetaText: { fontSize: 12 },
  replyActionContainer: { justifyContent: 'center', alignItems: 'center', width: 80 },
  selectedOverlay: { backgroundColor: 'rgba(0, 122, 255, 0.2)' },
});