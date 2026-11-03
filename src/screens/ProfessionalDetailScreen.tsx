import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Review, ReviewCard } from '../components/common/ReviewCard';
import { StarRating } from '../components/common/StarRating';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { PortfolioCarousel } from '../components/common/PortfolioCarousel';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

export default function ProfessionalDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user: currentUser, userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  
  const [professional, setProfessional] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.uid === uid;
  const isPremiumProfile = professional?.isPremium || false;
  const isBlocked = userProfile?.blockedUsers?.includes(uid) || false;

  useLayoutEffect(() => {
    if (!professional || isOwnProfile) {
        // Se for o próprio perfil, garante que não haja botão no header
        navigation.setOptions({ headerRight: () => null });
        return;
    };

    const handleBlockUser = () => {
      showModal({
        type: 'action-sheet',
        title: `Opções para ${professional.displayName}`,
        buttons: [
          {
            text: isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário",
            style: isBlocked ? 'default' : 'destructive',
            onPress: async () => {
              try {
                const functions = getFunctions();
                if (isBlocked) {
                  const unblockUser = httpsCallable(functions, 'unblockUser');
                  await unblockUser({ userIdToUnblock: uid });
                  showModal({ title: "Sucesso", message: `${professional.displayName} foi desbloqueado.`, buttons: [{ text: 'OK', onPress: () => {} }] });
                } else {
                  const blockUser = httpsCallable(functions, 'blockUser');
                  await blockUser({ userIdToBlock: uid });
                  showModal({ title: "Sucesso", message: `${professional.displayName} foi bloqueado.`, buttons: [{ text: 'OK', onPress: () => {} }] });
                }
                await refreshUserProfile();
              } catch (error) {
                showModal({ title: "Erro", message: "Não foi possível completar a ação.", buttons: [{ text: 'OK', onPress: () => {} }] });
              }
            }
          },
          { text: "Cancelar", style: "cancel", onPress: () => {} }
        ]
      })
    };

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleBlockUser} style={{ paddingHorizontal: 15 }}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      )
    });
  }, [navigation, professional, isOwnProfile, isBlocked, refreshUserProfile]);
  
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const logView = async () => {
      if (currentUser && uid && !isOwnProfile) {
        try {
          const functions = getFunctions();
          const logProfileView = httpsCallable(functions, 'logProfileView');
          await logProfileView({ professionalId: uid });
        } catch (error) {
          console.error("[DEBUG] Erro ao chamar a função logProfileView:", JSON.stringify(error, null, 2));
        }
      }
    };
    logView();

    const fetchProfessionalDetails = async () => {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (isMounted && docSnap.exists()) {
          setProfessional(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do profissional:", error);
      }
    };

    const reviewsCollection = collection(db, 'users', uid, 'reviews');
    const q = query(reviewsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (!isMounted) return;
      
      let totalRating = 0;
      
      const reviewPromises = querySnapshot.docs.map(async (document) => {
        const reviewData = { id: document.id, ...document.data() } as Review;
        totalRating += reviewData.rating;

        if (reviewData.reviewerId) {
          const reviewerDocRef = doc(db, 'users', reviewData.reviewerId);
          const reviewerDocSnap = await getDoc(reviewerDocRef);
          if (reviewerDocSnap.exists()) {
            const reviewerProfile = reviewerDocSnap.data() as UserProfile;
            reviewData.isReviewerPremium = reviewerProfile.isPremium || false;
          }
        }
        return reviewData;
      });

      const reviewsList = await Promise.all(reviewPromises);

      setReviews(reviewsList);
      setAvgRating(reviewsList.length > 0 ? totalRating / reviewsList.length : 0);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar avaliações:", error);
      if (isMounted) setLoading(false);
    });

    fetchProfessionalDetails();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [uid, currentUser, isOwnProfile]);

  const handleEditReview = (review: Review) => {
    router.push({
      pathname: "/(app)/leave-review/[userId]",
      params: {
        userId: uid,
        userName: professional?.displayName,
        reviewId: review.id,
        initialRating: review.rating.toString(),
        initialComment: review.comment,
      },
    });
  };

  const handleDeleteReview = (review: Review) => {
    showModal({
      title: "Excluir Avaliação",
      message: "Tem certeza que deseja excluir sua avaliação? Esta ação não pode ser desfeita.",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => {} },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const reviewRef = doc(db, 'users', uid, 'reviews', review.id);
              await deleteDoc(reviewRef);
              showModal({
                title: "Sucesso",
                message: "Sua avaliação foi removida.",
                buttons: [{ text: "OK", onPress: () => {} }]
              });
            } catch (error) {
              console.error("Erro ao excluir avaliação:", error);
              showModal({
                title: "Erro",
                message: "Não foi possível excluir a avaliação.",
                buttons: [{ text: "OK", onPress: () => {} }]
              });
            }
          },
        },
      ]
    });
  };
  
  const handleOpenLink = (url: string | undefined) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Não foi possível abrir o link", err));
    }
  };

  const handleContact = async () => {
    if (isBlocked) {
      showModal({ title: "Usuário Bloqueado", message: "Você não pode iniciar uma conversa com um usuário que você bloqueou.", buttons: [{ text: 'OK', onPress: () => {} }] });
      return;
    }
    if (!currentUser || !professional || !userProfile) return;

    const uids = [currentUser.uid, professional.uid].sort();
    const chatRoomId = uids.join('_');
    
    try {
      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      await setDoc(roomRef, {
        participants: uids,
        participantNames: {
          [currentUser.uid]: userProfile.displayName,
          [professional.uid]: professional.displayName,
        },
        participantPhotoURLs: {
          [currentUser.uid]: userProfile.photoURL || null,
          [professional.uid]: professional.photoURL || null,
        },
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao criar a sala de chat:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível iniciar a conversa. Tente novamente.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }

    router.push({
      pathname: '/(app)/chat/[chatRoomId]',
      params: { 
        chatRoomId: chatRoomId,
        recipientName: professional.displayName,
        recipientId: professional.uid,
        creatorName: userProfile.displayName,
      },
    } as any);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!professional) {
    return <View style={styles.centered}><Text>Perfil não encontrado.</Text></View>;
  }

  const hasSocialLinks = professional.website || professional.instagram || professional.linkedin;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: professional.displayName }} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient
          colors={isPremiumProfile ? ['#F38001', '#D36400'] : [theme.colors.white, theme.colors.white]}
          style={styles.header}
        >
          <View style={styles.avatar}>
            {professional.photoURL ? (
              <Image source={{ uri: professional.photoURL }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={50} color={isPremiumProfile ? theme.colors.white : theme.colors.primary} />
            )}
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, isPremiumProfile && styles.namePremium]}>{professional.displayName}</Text>
            {isPremiumProfile && (
              <MaterialCommunityIcons name="crown" size={20} color="#FFD700" style={styles.premiumIconName} />
            )}
          </View>
          <Text style={[styles.profession, isPremiumProfile && styles.professionPremium]}>{professional.profession}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color={isPremiumProfile ? '#ffeedcff' : theme.colors.secondary} />
            <Text style={[styles.location, isPremiumProfile && styles.locationPremium]}>{`${professional.address?.city}, ${professional.address?.state}`}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <StarRating rating={avgRating} color={isPremiumProfile ? '#FFD700' : '#FFC107'} />
            <Text style={[styles.ratingText, isPremiumProfile && styles.ratingTextPremium]}>{avgRating.toFixed(1)} ({reviews.length} avaliações)</Text>
          </View>
        </LinearGradient>

        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
              <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.white} />
              <Text style={styles.contactButtonText}>Conversar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPremiumProfile && uid && <PortfolioCarousel professionalId={uid} />}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <Text style={styles.bio}>{professional.bio}</Text>
        </View>
        
        {hasSocialLinks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Redes Sociais</Text>
            <View style={styles.socialsContainer}>
              {professional.website && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleOpenLink(professional.website)}>
                  <Ionicons name="globe-outline" size={30} color={theme.colors.secondary} />
                </TouchableOpacity>
              )}
              {professional.instagram && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleOpenLink(professional.instagram)}>
                  <Ionicons name="logo-instagram" size={30} color={theme.colors.secondary} />
                </TouchableOpacity>
              )}
              {professional.linkedin && (
                <TouchableOpacity style={styles.socialIcon} onPress={() => handleOpenLink(professional.linkedin)}>
                  <Ionicons name="logo-linkedin" size={30} color={theme.colors.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.sectionWithNoHorizontalPadding}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Avaliações</Text>
            {!isOwnProfile && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/leave-review/[userId]' as any, params: { userId: uid, userName: professional.displayName }})}>
                <Text style={styles.addReviewText}>Deixar uma avaliação</Text>
              </TouchableOpacity>
            )}
          </View>
          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ReviewCard
                  review={item}
                  isOwnReview={item.reviewerId === currentUser?.uid}
                  onEdit={() => handleEditReview(item)}
                  onDelete={() => handleDeleteReview(item)}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.lg - theme.spacing.md }}
            />
          ) : (
            <Text style={styles.placeholderText}>Nenhuma avaliação ainda.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: theme.spacing.xl },
  header: { 
    padding: theme.spacing.xl, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#e0bd99ff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: theme.spacing.md,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  namePremium: { color: theme.colors.white },
  premiumIconName: {
    marginLeft: theme.spacing.sm / 2,
  },
  profession: { fontSize: 16, color: theme.colors.primary, marginVertical: 4 },
  professionPremium: { color: '#ffeedcff' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  location: { fontSize: 14, color: theme.colors.secondary, marginLeft: 4 },
  locationPremium: { color: '#ffeedcff' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  ratingText: { marginLeft: 8, color: theme.colors.secondary },
  ratingTextPremium: { color: '#ffeedcff' },
  actionButtons: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg },
  contactButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  contactButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.sm, },
  section: { 
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionWithNoHorizontalPadding: {
    marginTop: theme.spacing.lg,
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: theme.spacing.md, 
    paddingHorizontal: theme.spacing.lg
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: theme.colors.text, 
  },
  bio: { 
    fontSize: 15, 
    lineHeight: 22, 
    color: theme.colors.text, 
  },
  placeholderText: { 
    color: theme.colors.secondary, 
    fontStyle: 'italic', 
    paddingHorizontal: theme.spacing.lg
  },
  addReviewText: { 
    color: theme.colors.primary, 
    fontWeight: 'bold' 
  },
  socialsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  socialIcon: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
});