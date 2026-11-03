import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';
import { StarRating } from './StarRating';

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerId: string;
  reviewerName: string;
  isReviewerPremium?: boolean;
}

interface ReviewCardProps {
  review: Review;
  isOwnReview: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const ReviewCard = ({ review, isOwnReview, onEdit, onDelete }: ReviewCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
          {review.isReviewerPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>
        <StarRating rating={review.rating} size={16} />
      </View>
      <Text style={styles.comment}>{review.comment}</Text>

      {isOwnReview && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="pencil" size={18} color={theme.colors.secondary} />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Ionicons name="trash-bin" size={18} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    width: 280,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  premiumBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  premiumText: {
    color: '#F38001',
    fontSize: 10,
    fontWeight: 'bold',
  },
  comment: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  actionText: {
    marginLeft: 4,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
});