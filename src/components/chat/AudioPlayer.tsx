import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import { theme } from '../../styles/theme';

interface AudioPlayerProps {
  uri: string;
  isMyMessage: boolean;
  durationMillis?: number | null; // duração salva no banco
}

// formata ms -> mm:ss
const formatMillis = (millis: number) => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// controle global para garantir que só 1 áudio toca de cada vez
let globalSound: Audio.Sound | null = null;

export const AudioPlayer = ({ uri, isMyMessage, durationMillis = 0 }: AudioPlayerProps) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [internalDuration, setInternalDuration] = useState<number>(durationMillis || 0);

  const playbackAnim = useRef(new Animated.Value(0)).current;
  const iconColor = isMyMessage ? theme.colors.white : theme.colors.primary;
  const trackColor = isMyMessage ? 'rgba(255, 255, 255, 0.5)' : 'rgba(224, 189, 153, 0.5)';
  const thumbColor = isMyMessage ? theme.colors.white : theme.colors.primary;

  useEffect(() => {
    let mounted = true;
    const loadSound = async () => {
      setIsLoading(true);
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, progressUpdateIntervalMillis: 200 }
        );
        soundRef.current = sound;
        soundRef.current.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

        const status = await soundRef.current.getStatusAsync();
        if (mounted && status.isLoaded && status.durationMillis) {
          setInternalDuration(status.durationMillis);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Erro ao carregar o áudio", error);
        setIsLoading(false);
      }
    };
    loadSound();

    return () => {
      mounted = false;
      (async () => {
        try {
          if (soundRef.current) {
            soundRef.current.setOnPlaybackStatusUpdate(null);
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {}
      })();
    };
  }, [uri]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    const s = status as AVPlaybackStatusSuccess;

    setPlaybackPosition(s.positionMillis ?? 0);

    const denom = internalDuration > 0 ? internalDuration : (s.durationMillis ?? 1);
    Animated.timing(playbackAnim, {
      toValue: (s.positionMillis ?? 0) / denom,
      duration: 150,
      useNativeDriver: false,
    }).start();

    if (s.durationMillis && internalDuration === 0) {
      setInternalDuration(s.durationMillis);
    }

    if (s.didJustFinish) {
      (async () => {
        setIsPlaying(false);
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.setPositionAsync(0);
          }
        } catch {}
        setPlaybackPosition(0);
        playbackAnim.setValue(0);
      })();
    }
  };

  const handlePlayPause = async () => {
    if (isLoading || !soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      // parar áudio global se outro estiver tocando
      if (globalSound && globalSound !== soundRef.current) {
        try {
          await globalSound.stopAsync();
        } catch {}
      }

      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        globalSound = soundRef.current;
      }
    } catch (error) {
      console.error("Erro ao tocar/pausar áudio", error);
    }
  };

  const displayMillis = playbackPosition > 0 ? playbackPosition : internalDuration;
  const formatted = formatMillis(displayMillis);

  const playbackPositionStyle = {
    left: playbackAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePlayPause} disabled={isLoading} style={styles.playButton}>
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={iconColor} />
        )}
      </TouchableOpacity>
      <View style={[styles.playbackBar, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.playbackCircle, { backgroundColor: thumbColor }, playbackPositionStyle]} />
      </View>
      <Text style={[styles.durationText, { color: iconColor }]}>{formatted}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', width: 200, paddingVertical: 4 },
  playButton: { width: 30, alignItems: 'center' },
  playbackBar: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: theme.spacing.md, justifyContent: 'center' },
  playbackCircle: { width: 12, height: 12, borderRadius: 6, position: 'absolute' },
  durationText: { fontSize: 12, fontWeight: '600', minWidth: 35, textAlign: 'center' },
});