// src/components/common/JobCard.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  location: {
    city: string;
    state: string;
  };
  isHighlighted?: boolean;
  postedByName: string;
  budget?: string;
  isNegotiable?: boolean;
  expiresAt: { toDate: () => Date };
}

interface JobCardProps {
  job: Job;
}

export const JobCard = ({ job }: JobCardProps) => {
  const router = useRouter();

  const posterFirstName = job.postedByName ? job.postedByName.split(' ')[0] : '';

  const handlePress = () => {
    router.push(`/job/${job.id}`);
  };

  const CardHeader = () => (
    <View style={styles.cardHeader}>
      <Text style={[styles.title, job.isHighlighted && styles.titleHighlighted]}>{job.title}</Text>
      <Text style={[styles.category, job.isHighlighted && styles.categoryHighlighted]}>{job.category}</Text>
    </View>
  );

  return (
    <TouchableOpacity style={[styles.card, job.isHighlighted && styles.highlightedCard]} onPress={handlePress}>
      
      {job.isHighlighted && (
        <View style={styles.highlightedBadge}>
          <Ionicons name="star" size={12} color={theme.colors.white} />
          <Text style={styles.highlightedText}>DESTAQUE</Text>
        </View>
      )}

      {job.isHighlighted ? (
        <LinearGradient
          colors={['#F38001', '#FF952C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.highlightedHeader}
        >
          <CardHeader />
        </LinearGradient>
      ) : (
        <CardHeader />
      )}

      <View style={styles.cardBody}>
        <Text style={styles.descriptionPreview} numberOfLines={2}>
          {job.description}
        </Text>
        <View style={styles.detailsContainer}>
          <View style={styles.detailPill}>
            <Ionicons name="location-outline" size={16} color={theme.colors.secondary} />
            <Text style={styles.detailPillText}>{`${job.location?.city}, ${job.location?.state}`}</Text>
          </View>
          <View style={styles.detailPill}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.secondary} />
            <Text style={styles.detailPillText}>{job.budget || "A combinar"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="person-circle-outline" size={16} color={theme.colors.secondary} />
        <Text style={styles.footerText}>{`Postado por ${posterFirstName}`}</Text>
        <View style={{flex: 1}} />
        <Ionicons name="time-outline" size={16} color={theme.colors.secondary} />
        <Text style={styles.footerText}>{`Expira em: ${job.expiresAt?.toDate().toLocaleDateString('pt-BR')}`}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  highlightedCard: {
    borderColor: theme.colors.primary,
  },
  highlightedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  highlightedText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardHeader: {
    padding: theme.spacing.md,
  },
  highlightedHeader: {
    padding: theme.spacing.md,
    borderTopLeftRadius: theme.borderRadius.lg - 1,
    borderTopRightRadius: theme.borderRadius.lg - 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  titleHighlighted: {
    color: theme.colors.white,
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  categoryHighlighted: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardBody: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  descriptionPreview: {
    fontSize: 14,
    color: theme.colors.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e7ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  detailPillText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.secondary,
  },
});