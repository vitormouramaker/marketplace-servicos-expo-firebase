import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category, getCategories } from '../../services/categoryService';
import { theme } from '../../styles/theme';

export const CategoriesGrid = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        // O erro já é logado no service, aqui apenas paramos o loading
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryPress = (categoryName: string) => {
    // Navega para a tela de explorar, passando a categoria como um parâmetro de busca
    router.push({
      pathname: '/(app)/explore',
      params: { initialQuery: categoryName },
    } as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => handleCategoryPress(item.name)}
          >
            <Ionicons 
              name={item.icon as keyof typeof Ionicons.glyphMap} 
              size={32} 
              color={theme.colors.primary} 
            />
            <Text style={styles.cardText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        scrollEnabled={false} // Desabilita o scroll da FlatList, pois a tela principal já tem scroll
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing.sm / 2,
    minHeight: 120,
  },
  cardText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
});