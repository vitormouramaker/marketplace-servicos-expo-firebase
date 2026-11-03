import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProfessionalCard } from '../components/common/ProfessionalCard';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';

export function ExploreScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>();

  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!userProfile) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const usersCollection = collection(db, "users");
        let finalQuery;

        if (initialQuery) {
          const professionsRef = collection(db, "professions");
          const categoryProfessionsQuery = query(professionsRef, where("categoryName", "==", initialQuery));
          const professionsSnapshot = await getDocs(categoryProfessionsQuery);
          const professionNames = professionsSnapshot.docs.map(doc => doc.data().name);

          if (professionNames.length === 0) {
            setProfessionals([]);
            setFilteredProfessionals([]);
            return;
          }

          finalQuery = query(
            usersCollection,
            where("profileType", "==", "professional"),
            where("profession", "in", professionNames)
          );

        } else {
          const userState = userProfile?.address?.state;
          if (userState) {
            finalQuery = query(usersCollection, where("profileType", "==", "professional"), where("address.state", "==", userState));
          } else {
            finalQuery = query(usersCollection, where("profileType", "==", "professional"));
          }
        }

        const querySnapshot = await getDocs(finalQuery);
        const professionalsList: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== userProfile?.uid) {
            professionalsList.push({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        });
        setProfessionals(professionalsList);
        setFilteredProfessionals(professionalsList);

      } catch (error) {
        console.error("Erro ao buscar profissionais:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if(userProfile) {
      fetchProfessionals();
    }
  }, [userProfile, initialQuery]);

  useEffect(() => {
    if (initialQuery && searchQuery === initialQuery) {
       setFilteredProfessionals(professionals);
       return;
    }

    if (searchQuery === '') {
      setFilteredProfessionals(professionals);
    } else {
      const filtered = professionals.filter(prof => 
        prof.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.profession?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProfessionals(filtered);
    }
  }, [searchQuery, professionals]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: initialQuery || 'Explorar',
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.white,
          headerShown: true, // Garante que o cabeçalho seja exibido
        }}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar por nome ou profissão..."
                placeholderTextColor={theme.colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          <FlatList
            data={filteredProfessionals}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <ProfessionalCard
                professional={item}
                onPress={() => router.push({ pathname: '/(app)/professional/[uid]', params: { uid: item.uid } } as any)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum profissional encontrado.</Text>}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  listContainer: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  emptyText: { textAlign: 'center', marginTop: 50, color: theme.colors.secondary },
});