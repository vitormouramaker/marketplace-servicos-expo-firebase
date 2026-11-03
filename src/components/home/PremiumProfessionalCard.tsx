import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserProfile } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';

interface CardProps {
  professional: UserProfile;
  onPress: () => void;
}

export const PremiumProfessionalCard = ({ professional, onPress }: CardProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={['#F38001', '#D36400']}
        style={styles.card}
      >
        <View style={styles.badge}>
          <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
          <Text style={styles.badgeText}>Premium</Text>
        </View>

        <View style={styles.avatar}>
          {professional.photoURL ? (
            <Image source={{ uri: professional.photoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={30} color={theme.colors.primary} />
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>{professional.displayName}</Text>
        <Text style={styles.profession} numberOfLines={1}>{professional.profession}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 180,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: theme.spacing.xsm,
  },
  profession: {
    fontSize: 12,
    color: '#ffeedcff',
    textAlign: 'center',
  },
});