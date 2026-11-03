import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PaymentWebViewModal } from '../components/common/PaymentWebViewModal';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

interface CoinPackage {
  id: string;
  priceBRL: number;
  amountCoins: number;
  bonusCoins?: number;
  isPopular?: boolean;
}

export default function WalletScreen() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const packagesRef = collection(db, 'coin_packages');
        const q = query(packagesRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const packagesList = querySnapshot.docs.map(doc => ({
          id: doc.data().productId,
          ...doc.data(),
        } as CoinPackage));
        setPackages(packagesList);
      } catch (error) {
        console.error("Erro ao buscar pacotes de moedas:", error);
        showModal({
          title: "Erro",
          message: "Não foi possível carregar os pacotes de moedas.",
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handlePurchase = async (pkg: CoinPackage) => {
    setIsPurchasing(pkg.id);
    try {
      const functions = getFunctions();
      const createPaymentOrder = httpsCallable(functions, 'createPaymentOrder');
      const result = await createPaymentOrder({ packageId: pkg.id });

      const { paymentUrl, demoMode, coinsAdded } = result.data as { paymentUrl?: string; demoMode?: boolean; coinsAdded?: number };

      if (demoMode) {
        // Emulador local sem Mercado Pago: as moedas já foram creditadas pela função.
        await refreshUserProfile();
        showModal({
          title: "Modo demonstração",
          message: `${coinsAdded ?? 0} moedas foram creditadas sem cobrança (ambiente local, sem Mercado Pago).`,
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } else if (paymentUrl) {
        await WebBrowser.openBrowserAsync(paymentUrl);
      } else {
        throw new Error("URL de pagamento não recebida.");
      }

    } catch (error: any) {
      console.error("Erro ao iniciar o pagamento no app:", error);
      showModal({
        title: "Erro",
        message: `Não foi possível iniciar o pagamento: ${error.message}`,
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const renderPackage = (pkg: CoinPackage) => {
    const isPopular = pkg.isPopular === true;

    let cardContent;
    if (isPurchasing === pkg.id) {
      cardContent = <ActivityIndicator color={isPopular ? theme.colors.white : theme.colors.primary} />;
    } else {
      cardContent = (
        <>
          <View style={styles.coinsContainer}>
            <Text style={[styles.coinsAmount, isPopular && styles.popularTextPrimary]}>
              {pkg.amountCoins.toLocaleString('pt-BR')}
            </Text>
            <Text style={[styles.coinsLabel, isPopular && styles.popularTextPrimary]}> moedas</Text>
          </View>
          {pkg.bonusCoins ? <Text style={styles.bonusText}>+{pkg.bonusCoins} moedas bônus!</Text> : null}
          <Text style={[styles.priceText, isPopular && styles.popularTextSecondary]}>R$ {pkg.priceBRL.toFixed(2).replace('.', ',')}</Text>
        </>
      );
    }

    return (
      <TouchableOpacity 
        key={pkg.id} 
        style={[styles.packageCard, isPopular && styles.popularCard]} 
        onPress={() => handlePurchase(pkg)}
        disabled={!!isPurchasing}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>POPULAR</Text>
          </View>
        )}
        {cardContent}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Minha Carteira' }} />
      <ScrollView>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Saldo Atual</Text>
          <Text style={styles.balanceValue}>{(userProfile?.walletBalance ?? 0).toLocaleString('pt-BR')} moedas</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adicionar Saldo</Text>
          <Text style={styles.sectionSubtitle}>Escolha um pacote para recarregar sua carteira.</Text>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.packagesContainer}>
              {packages.map(renderPackage)}
            </View>
          )}
        </View>
      </ScrollView>

      <PaymentWebViewModal
        visible={modalVisible}
        url={paymentUrl}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  balanceContainer: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' },
  balanceValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.white },
  section: { padding: theme.spacing.lg },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  sectionSubtitle: { fontSize: 16, color: theme.colors.secondary, marginBottom: theme.spacing.lg },
  packagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  packageCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#eee'
  },
  popularCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.secondary,
    transform: [{ scale: 1.05 }],
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    marginTop: 10,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    elevation: 9,
  },
  popularBadgeText: {
    color: '#78350f',
    fontWeight: 'bold',
    fontSize: 12,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  coinsAmount: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center' },
  coinsLabel: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginLeft: 4 },
  bonusText: { color: '#28a745', fontWeight: 'bold', marginTop: 4, fontSize: 12 },
  priceText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginTop: theme.spacing.md },
  popularTextPrimary: {
    color: theme.colors.white,
  },
  popularTextSecondary: {
    color: '#ffeedcff',
  },
});