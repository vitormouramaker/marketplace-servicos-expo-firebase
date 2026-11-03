import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, deleteField, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; // Importação adicionada
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlockedUserBanner } from '../components/chat/BlockedUserBanner';
import { MediaPreviewModal } from '../components/chat/MediaPreviewModal';
import { MessageItem } from '../components/chat/MessageItem';
import { ReplyPreview } from '../components/chat/ReplyPreview';
import { ImageViewerModal } from '../components/common/ImageViewerModal';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { auth, db } from '../services/firebaseConfig';
import { uploadChatMedia } from '../services/storageService';
import { theme } from '../styles/theme';
import { formatDuration } from '../utils/formatters';

// Tipos
type Asset = {
  uri: string;
  mimeType?: string;
  name?: string;
  type?: string;
  fileSize?: number;
  duration?: number;
};

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

type ModalButton = {
  text: string;
  onPress: () => void;
  style?: 'cancel' | 'destructive' | 'default';
};

// Componente Principal da Tela
export function ChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { showModal } = useModal();
  const { user, userProfile, refreshUserProfile } = useAuth(); // refreshUserProfile adicionado
  const params = useLocalSearchParams<{ chatRoomId: string, recipientName?: string, recipientId?: string, creatorName?: string }>();
  const headerHeight = useHeaderHeight();

  const [chatRoomId, setChatRoomId] = useState(params.chatRoomId);
  const [recipientId, setRecipientId] = useState(params.recipientId);
  const [recipientName, setRecipientName] = useState(params.recipientName);
  const [creatorName, setCreatorName] = useState(params.creatorName);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false); // Novo estado

  const currentUser = auth.currentUser;
  const flatListRef = useRef<FlatList>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Verifica se o destinatário está bloqueado
  const isRecipientBlocked = userProfile?.blockedUsers?.includes(recipientId || '') || false;

  // função para desbloquear usuário
  const handleUnblockInChat = async () => {
    if (!recipientId) return;
    setIsUnblocking(true);
    try {
      const functions = getFunctions();
      const unblockUser = httpsCallable(functions, 'unblockUser');
      await unblockUser({ userIdToUnblock: recipientId });
      await refreshUserProfile();
    } catch (error) {
      showModal({ title: "Erro", message: "Não foi possível desbloquear o usuário.", buttons: [{ text: 'OK', onPress: () => {} }] });
    } finally {
      setIsUnblocking(false);
    }
  };

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const scrollOffset = event.nativeEvent.contentOffset.y;
    setShowScrollToBottom(scrollOffset > 300);
  }, []);

  const handleToggleSelection = useCallback((messageId: string) => {
    setSelectedMessages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(messageId)) {
        newSelection.delete(messageId);
      } else {
        newSelection.add(messageId);
      }
      return newSelection;
    });
  }, []);

  const handleLongPressMessage = useCallback((item: Message) => {
    if (!isSelectionMode && item.senderId === currentUser?.uid) {
      setIsSelectionMode(true);
      handleToggleSelection(item.id);
    }
  }, [isSelectionMode, handleToggleSelection, currentUser?.uid]);

  const handlePressMessage = useCallback((item: Message) => {
    if (isSelectionMode && item.senderId === currentUser?.uid) {
      handleToggleSelection(item.id);
    }
  }, [isSelectionMode, handleToggleSelection, currentUser?.uid]);

  const handleSwipeToReply = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleViewImage = useCallback((url: string) => {
    setViewerImageUrl(url);
  }, []);
  
  const cancelSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  useEffect(() => {
    const loadChatInfo = async () => {
      if (chatRoomId && (!recipientId || !recipientName)) {
        console.log("Parâmetros do header ausentes, buscando no Firestore...");
        const roomRef = doc(db, 'chat_rooms', chatRoomId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists() && user) {
          const roomData = roomSnap.data();
          const otherUserId = roomData.participants.find((p: string) => p !== user.uid);
          if (otherUserId) {
            setRecipientId(otherUserId);
            setRecipientName(roomData.participantNames[otherUserId]);
            setCreatorName(roomData.participantNames[user.uid]);
          }
        }
      }
    };
    loadChatInfo();
  }, [chatRoomId, user]);

  const navigateToProfile = () => {
    if (recipientId) {
      router.push({
        pathname: '/(app)/professional/[uid]',
        params: { uid: recipientId }
      } as any);
    }
  };

  useEffect(() => {
    if (recipientName) {
      navigation.setOptions({
        title: recipientName,
        headerLeft: undefined,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.white,
        headerBackTitleVisible: false,
        headerRight: () => (
          <TouchableOpacity onPress={navigateToProfile} style={styles.headerButton}>
            <Ionicons name="information-circle-outline" size={28} color={theme.colors.white} />
          </TouchableOpacity>
        ),
      });
    }
  }, [isSelectionMode, selectedMessages, navigation, recipientName, recipientId]);

  const deleteMessagesForMe = useCallback(async () => {
    if (!currentUser || !chatRoomId) return;
    const batch = writeBatch(db);
    selectedMessages.forEach(id => {
      const messageRef = doc(db, 'chat_rooms', chatRoomId, 'messages', id);
      batch.update(messageRef, { deletedFor: arrayUnion(currentUser.uid) });
    });
    
    try {
      await batch.commit();
      cancelSelectionMode();
    } catch (error) {
      console.error("Erro ao apagar mensagem 'para mim':", error);
      showModal({
        title: "Erro ao Apagar",
        message: "Não foi possível apagar a mensagem. Verifique suas permissões de segurança no Firestore.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    }
  }, [currentUser, chatRoomId, selectedMessages, cancelSelectionMode, showModal]);

  const deleteMessagesForEveryone = useCallback(async () => {
    if (!chatRoomId) return;
    const batch = writeBatch(db);
    selectedMessages.forEach(id => {
      const messageRef = doc(db, 'chat_rooms', chatRoomId, 'messages', id);
      batch.update(messageRef, {
        mediaURL: deleteField(),
        mediaType: deleteField(),
        fileName: deleteField(),
        durationMillis: deleteField(),
        fileSize: deleteField(),
        deletedForAll: true,
      });
    });

    try {
      await batch.commit();
      cancelSelectionMode();
    } catch (error) {
      console.error("Erro ao apagar mensagem 'para todos':", error);
      showModal({
        title: "Erro ao Apagar",
        message: "Não foi possível apagar a mensagem para todos. Verifique suas permissões de segurança no Firestore.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    }
  }, [chatRoomId, selectedMessages, cancelSelectionMode, showModal]);

  const handleDeletePress = useCallback(() => {
    const count = selectedMessages.size;
    const canDeleteForAll = Array.from(selectedMessages).every(id => {
      const msg = messages.find(m => m.id === id);
      return msg?.senderId === currentUser?.uid;
    });

    let buttons: ModalButton[] = [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      { text: 'Para mim', onPress: deleteMessagesForMe },
    ];

    if (canDeleteForAll) {
      buttons.push({ text: 'Para todos', style: 'destructive', onPress: deleteMessagesForEveryone });
    }
    
    showModal({
      title: `Apagar mensagem${count > 1 ? 'ns' : ''}`,
      message: `Tem certeza que quer apagar ${count} mensagem${count > 1 ? 'ns' : ''}?`,
      buttons: buttons
    });
  }, [selectedMessages, messages, currentUser?.uid, showModal, deleteMessagesForMe, deleteMessagesForEveryone]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingIndicatorAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(recordingIndicatorAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    } else {
      recordingIndicatorAnim.stopAnimation();
      recordingIndicatorAnim.setValue(0);
    }
  }, [isRecording, recordingIndicatorAnim]);

  useEffect(() => {
    if (isSelectionMode) {
      navigation.setOptions({
        title: `${selectedMessages.size} selecionada(s)`,
        headerLeft: () => (
          <TouchableOpacity onPress={cancelSelectionMode} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.colors.white} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          selectedMessages.size > 0 && (
            <TouchableOpacity onPress={handleDeletePress} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={26} color={theme.colors.white} />
            </TouchableOpacity>
          )
        ),
      });
    } else {
      navigation.setOptions({
        title: recipientName || 'Chat',
        headerLeft: undefined,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.white,
        headerBackTitleVisible: false,
        headerRight: () => (
          <TouchableOpacity onPress={navigateToProfile} style={styles.headerButton}>
            <Ionicons name="information-circle-outline" size={28} color={theme.colors.white} />
          </TouchableOpacity>
        ),
      });
    }
  }, [isSelectionMode, selectedMessages.size, navigation, recipientName, cancelSelectionMode, handleDeletePress]);

  useEffect(() => {
    if (!chatRoomId || !currentUser) {
      setLoading(false);
      return;
    }
    const messagesCollection = collection(db, 'chat_rooms', chatRoomId, 'messages');
    const q = query(messagesCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Erro no listener do Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatRoomId, currentUser]);
  
  useEffect(() => {
    if (highlightedMessageId) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.delay(500),
        Animated.timing(highlightAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start(() => setHighlightedMessageId(null));
    }
  }, [highlightedMessageId, highlightAnim]);
  
  const createReplyPayload = (message: Message) => {
    if (!currentUser) return undefined;
    const payload: Message['replyTo'] = {
      messageId: message.id,
      senderName: message.senderId === currentUser.uid ? 'Você' : recipientName || 'Usuário',
    };
    if (message.text) payload.text = message.text;
    if (message.mediaType) payload.mediaType = message.mediaType;
    if (message.fileName) payload.fileName = message.fileName;
    return payload;
  };

  const sendMessage = async (messageData: Partial<Message>) => {
    if (!currentUser || !chatRoomId || !recipientId) return;
    try {
      await addDoc(collection(db, 'chat_rooms', chatRoomId, 'messages'), {
        ...messageData,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      showModal({ title: "Erro", message: "Não foi possível enviar sua mensagem.", buttons: [{ text: 'OK', onPress: () => {} }] });
    }
  };
  
  const handleSend = async () => {
    if (newMessage.trim() === '' || !currentUser || !chatRoomId) return;
    const textToSend = newMessage;
    setNewMessage('');
    const messagePayload: Partial<Message> = { text: textToSend };
    if (replyingTo) {
      messagePayload.replyTo = createReplyPayload(replyingTo);
      setReplyingTo(null);
    }
    await sendMessage(messagePayload);
  };

  const handleChooseMedia = () => {
    showModal({
      type: 'action-sheet',
      title: 'O que você gostaria de enviar?',
      buttons: [
        { text: 'Imagem/Vídeo da Galeria', onPress: pickMediaFromLibrary },
        { text: 'Usar Câmera', onPress: pickMediaFromCamera },
        { text: 'Documento', onPress: pickDocument },
        { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      ]
    });
  };

  const pickMediaFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPreviewAsset({
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.fileName ?? undefined,
        fileSize: asset.fileSize ?? undefined,
        duration: asset.duration ?? undefined,
      });
    }
  };

  const pickMediaFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPreviewAsset({
        uri: asset.uri,
        mimeType: asset.mimeType,
        name: asset.fileName ?? undefined,
        fileSize: asset.fileSize ?? undefined,
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        handleSendFile(asset);
      }
    } catch (err) {
      showModal({ title: "Erro", message: "Não foi possível selecionar o documento.", buttons: [{ text: "OK", onPress: () => {} }] });
    }
  };

  const handleSendMedia = async (asset: Asset, caption: string) => {
    if (!currentUser || !chatRoomId || !recipientId) return;
    setIsUploading(true);
    setPreviewAsset(null);
    try {
      const fileName = asset.name || `media-${Date.now()}`;
      const mediaType = asset.mimeType?.startsWith('image') ? 'image' : 'video';
      const participants = [currentUser.uid, recipientId];
      const downloadURL = await uploadChatMedia(asset.uri, fileName, chatRoomId, participants);
      const messagePayload: Partial<Message> = {
        mediaURL: downloadURL,
        mediaType,
        fileName,
        durationMillis: asset.duration || null,
        fileSize: asset.fileSize,
      };
      if (caption.trim()) messagePayload.text = caption.trim();
      if (replyingTo) {
        messagePayload.replyTo = createReplyPayload(replyingTo);
        setReplyingTo(null);
      }
      await sendMessage(messagePayload);
    } catch (error) {
      showModal({ title: "Erro de Upload", message: "Não foi possível enviar sua mídia.", buttons: [{ text: 'OK', onPress: () => {} }] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendFile = async (asset: DocumentPicker.DocumentPickerAsset) => {
    if (!currentUser || !chatRoomId || !recipientId) return;
    setIsUploading(true);
    try {
      const participants = [currentUser.uid, recipientId];
      const fileName = asset.name || asset.uri.split('/').pop() || 'Documento';
      const downloadURL = await uploadChatMedia(asset.uri, fileName, chatRoomId, participants);
      const messagePayload: Partial<Message> = {
        mediaURL: downloadURL,
        mediaType: 'file',
        fileName: fileName,
        fileSize: asset.size,
      };
      if (replyingTo) {
        messagePayload.replyTo = createReplyPayload(replyingTo);
        setReplyingTo(null);
      }
      await sendMessage(messagePayload);
    } catch (error) {
      showModal({ title: "Erro de Upload", message: "Não foi possível enviar seu arquivo.", buttons: [{ text: 'OK', onPress: () => {} }] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplyPress = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      flatListRef.current?.scrollToIndex({ index: messageIndex, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(messageId);
    } else {
      showModal({ title: "Mensagem não encontrada", message: "A mensagem original pode ter sido apagada.", buttons: [{ text: "OK", onPress: () => {} }] });
    }
  };

  async function startRecording() {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
        setRecording(undefined);
      }
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        showModal({ title: "Permissão Necessária", message: "Você precisa permitir o acesso ao microfone para gravar áudios.", buttons: [{ text: "OK", onPress: () => {} }] });
        return;
      }
      setIsRecording(true);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000) as unknown as number;
    } catch (err) {
      console.error('Falha ao iniciar a gravação', err);
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecording(undefined);
    }
  }

  async function stopRecording() {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const duration = status.durationMillis ?? 0;
      if (uri) {
        const asset: Asset = { uri, name: `audio-${Date.now()}.m4a`, mimeType: 'audio/m4a' };
        handleSendAudio(asset, duration);
      }
    } catch (err) {
      console.error('Erro ao finalizar a gravação', err);
      showModal({ title: "Erro", message: "Não foi possível finalizar a gravação.", buttons: [{ text: "OK", onPress: () => {} }] });
    } finally {
      setRecording(undefined);
    }
  }

  const handleSendAudio = async (asset: Asset, durationMillis: number) => {
    if (!currentUser || !chatRoomId || !recipientId) return;
    setIsUploading(true);
    try {
      const fileName = asset.name || `audio-${Date.now()}`;
      const participants = [currentUser.uid, recipientId];
      const downloadURL = await uploadChatMedia(asset.uri, fileName, chatRoomId, participants);
      const messagePayload: Partial<Message> = {
        mediaURL: downloadURL,
        mediaType: 'audio',
        fileName: fileName,
        durationMillis: durationMillis,
      };
      if (replyingTo) {
        messagePayload.replyTo = createReplyPayload(replyingTo);
        setReplyingTo(null);
      }
      await sendMessage(messagePayload);
    } catch (error) {
      console.error("Erro ao enviar audio:", error);
      showModal({ title: "Erro de Upload", message: "Não foi possível enviar seu áudio.", buttons: [{ text: 'OK', onPress: () => {} }] });
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
    const isSelected = selectedMessages.has(item.id);
    return (
      <MessageItem
        item={item}
        isMyMessage={item.senderId === currentUser?.uid}
        isSelected={isSelected}
        isSelectionMode={isSelectionMode}
        highlightedMessageId={highlightedMessageId}
        highlightAnim={highlightAnim}
        currentUserId={currentUser?.uid}
        onPress={handlePressMessage}
        onLongPress={handleLongPressMessage}
        onSwipeToReply={handleSwipeToReply}
        onViewImage={handleViewImage}
        onReplyPress={handleReplyPress}
        isInteractionDisabled={isRecipientBlocked} // Desabilita interações se bloqueado
      />
    );
  }, [
    currentUser?.uid, 
    selectedMessages, 
    isSelectionMode, 
    highlightedMessageId, 
    highlightAnim, 
    handlePressMessage, 
    handleLongPressMessage, 
    handleSwipeToReply, 
    handleViewImage,
    handleReplyPress,
    isRecipientBlocked,
  ]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  const recordingIndicatorStyle = {
    opacity: recordingIndicatorAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
  };

  const ChatContent = (
    <>
      <FlatList
        ref={flatListRef}
        data={messages} 
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.messagesContainer}
        style={{ flex: 1 }}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={21}
        inverted
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showScrollToBottom && (
        <TouchableOpacity
          style={styles.scrollToBottomButton} 
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <Ionicons name="arrow-down" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      )}
      
      {isUploading && <ActivityIndicator style={styles.uploadIndicator} color={theme.colors.primary} />}

      {isRecipientBlocked ? (
        <BlockedUserBanner 
          userName={recipientName || 'este usuário'} 
          onUnblock={handleUnblockInChat}
          isLoading={isUnblocking}
        />
      ) : (
        !isSelectionMode && (
          <View style={styles.inputOuterContainer}>
            {replyingTo && (
              <ReplyPreview
                senderName={replyingTo.senderId === currentUser?.uid ? 'Você' : recipientName || 'Usuário'}
                text={replyingTo.text}
                mediaType={replyingTo.mediaType}
                fileName={replyingTo.fileName}
                onCancel={() => setReplyingTo(null)}
              />
            )}
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                {isRecording ? (
                  <View style={styles.recordingContainer}>
                    <Animated.View style={recordingIndicatorStyle}>
                      <Ionicons name="mic" size={24} color={theme.colors.error} />
                    </Animated.View>
                    <Text style={styles.recordingTimerText}>{formatDuration(recordingDuration * 1000)}</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={handleChooseMedia} disabled={isUploading}>
                      <Ionicons name="add" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.input}
                      value={newMessage}
                      onChangeText={setNewMessage}
                      placeholder="Digite sua mensagem..."
                      placeholderTextColor={theme.colors.placeholder}
                      multiline
                    />
                  </>
                )}
              </View>

              {newMessage.trim() === '' && !isRecording ? (
                <TouchableOpacity style={styles.actionButton} onPress={startRecording} disabled={isUploading}>
                  <Ionicons name="mic-outline" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
              ) : isRecording ? (
                <TouchableOpacity style={styles.actionButton} onPress={stopRecording}>
                  <Ionicons name="send" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionButton} onPress={handleSend} disabled={isUploading}>
                  <Ionicons name="send" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior="padding"
          keyboardVerticalOffset={headerHeight}
          enabled
        >
          {ChatContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {ChatContent}
        </View>
      )}

      <ImageViewerModal visible={!!viewerImageUrl} imageUrl={viewerImageUrl} onClose={() => setViewerImageUrl(null)} />
      <MediaPreviewModal visible={!!previewAsset} asset={previewAsset} onClose={() => setPreviewAsset(null)} onSend={handleSendMedia} isSending={isUploading} />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContainer: { 
    paddingHorizontal: theme.spacing.md, 
    paddingTop: theme.spacing.md 
  },
  inputOuterContainer: { 
    paddingHorizontal: theme.spacing.md, 
    paddingVertical: theme.spacing.sm, 
    borderTopWidth: 1, 
    borderTopColor: '#e0e0e0', 
    backgroundColor: '#fff' 
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 48,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.sm,
    fontSize: 16,
    maxHeight: 100,
  },
  actionButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  recordingTimerText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: 10,
    fontVariant: ['tabular-nums']
  },
  headerButton: { marginHorizontal: 10, padding: 5 },
  uploadIndicator: { padding: theme.spacing.sm },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 90, 
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 81, 0, 0.77)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});