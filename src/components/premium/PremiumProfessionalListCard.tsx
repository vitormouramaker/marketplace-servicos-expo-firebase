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

export const PremiumProfessionalListCard = ({ professional, onPress }: CardProps) => {
  const locationText = professional.address 
    ? `${professional.address.city}, ${professional.address.state}` 
    : 'Local não informado';

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

        <View style={styles.infoContainer}>
          <Text style={styles.name}>{professional.displayName}</Text>
          <Text style={styles.profession}>{professional.profession}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#ffeedcff" />
            <Text style={styles.location}>{locationText}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ffeedcff" />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 14,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  profession: {
    fontSize: 14,
    color: '#ffeedcff',
    marginVertical: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    color: '#ffeedcff',
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});