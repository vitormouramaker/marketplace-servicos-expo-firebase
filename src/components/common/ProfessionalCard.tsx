import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserProfile } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';

interface ProfessionalCardProps {
  professional: UserProfile;
  onPress: () => void;
}

export const ProfessionalCard = ({ professional, onPress }: ProfessionalCardProps) => {
  const professionText = professional.profession || 'Não especificado';
  const locationText = professional.address ? `${professional.address.city}, ${professional.address.state}` : 'Local não informado';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        {professional.photoURL ? (
          <Image source={{ uri: professional.photoURL }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={30} color={theme.colors.primary} />
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{professional.displayName}</Text>
        <Text style={styles.profession}>{professionText}</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={theme.colors.secondary} />
          <Text style={styles.location}>{locationText}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.lightGray} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0bd99ff',
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
    color: theme.colors.text,
  },
  profession: {
    fontSize: 14,
    color: theme.colors.primary,
    marginVertical: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  location: {
    fontSize: 12,
    color: theme.colors.secondary,
    marginLeft: 4,
  },
});