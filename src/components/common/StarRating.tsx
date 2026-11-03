import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
}

export const StarRating = ({ rating, size = 20, color = '#FFC107' }: StarRatingProps) => {
  const totalStars = 5;
  const filledStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = totalStars - filledStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      {[...Array(filledStars)].map((_, index) => (
        <Ionicons key={`full-${index}`} name="star" size={size} color={color} />
      ))}
      {hasHalfStar && <Ionicons key="half" name="star-half" size={size} color={color} />}
      {[...Array(emptyStars)].map((_, index) => (
        <Ionicons key={`empty-${index}`} name="star-outline" size={size} color={color} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});