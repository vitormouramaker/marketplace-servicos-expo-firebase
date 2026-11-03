import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { db } from '../../services/firebaseConfig';
import { theme } from '../../styles/theme';

interface PortfolioItem {
  id: string;
  imageURL: string;
}

interface Props {
  professionalId: string;
}

const { width } = Dimensions.get('window');

export const PortfolioCarousel = ({ professionalId }: Props) => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const portfolioRef = collection(db, 'users', professionalId, 'portfolio');
    const q = query(portfolioRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PortfolioItem[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as PortfolioItem));
      setPortfolio(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [professionalId]);

  if (loading) {
    return <ActivityIndicator color={theme.colors.primary} />;
  }
  
  if (portfolio.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfólio</Text>
      <FlatList
        data={portfolio}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={{ uri: item.imageURL }} style={styles.image} />
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: { 
    marginTop: theme.spacing.lg,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  listContainer: {
    paddingLeft: theme.spacing.lg,
  },
  image: {
    width: width * 0.7,
    height: width * 0.5,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
});