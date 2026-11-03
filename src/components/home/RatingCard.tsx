import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../styles/theme';
import { StarRating } from '../common/StarRating';

interface RatingCardProps {
  rating: number;
  reviewCount: number;
}

export const RatingCard = ({ rating, reviewCount }: RatingCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Sua Avaliação Média</Text>
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
        <StarRating rating={rating} size={24} />
      </View>
      <Text style={styles.reviewCount}>{reviewCount} avaliações recebidas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffbe6',
    borderColor: '#fef9c3',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#F38001',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F38001',
    marginRight: theme.spacing.md,
  },
  reviewCount: {
    fontSize: 14,
    color: '#d97706',
  },
});