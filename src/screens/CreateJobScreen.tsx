import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Picker } from '../components/common/Picker';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebaseConfig';
import { City, getCitiesByState, getStates, State } from '../services/locationService';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';
import { getNextMondayMidnight } from '../utils/dateHelpers';

interface JobCosts {
  postJobBaseCost: number;
  highlightJobCost: number;
  costPerExtraDay: number;
}

const ALL_DURATION_OPTIONS = [
  '1 dia',
  '2 dias',
  '3 dias',
  '4 dias',
  '5 dias',
  '6 dias',
  '7 dias',
  '10 dias',
  '15 dias',
  '30 dias'
];

export default function CreateJobScreen() {
  const router = useRouter();
  const { userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [costs, setCosts] = useState<JobCosts | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<string | null>('1 dia');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [budget, setBudget] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  
  const [totalCost, setTotalCost] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [isUpgradingFromFree, setIsUpgradingFromFree] = useState(false);

  const freePostsAvailable = userProfile?.dailyFreePosts?.count ?? 0;
  const hasFreePosts = freePostsAvailable > 0;

  // const getNextResetDate = (lastResetTimestamp: any) => {
  //   if (!lastResetTimestamp) return new Date();
  //   const lastResetDate = lastResetTimestamp.toDate();
  //   const nextResetDate = new Date(lastResetDate);
  //   nextResetDate.setDate(nextResetDate.getDate() + 7);
  //   return nextResetDate;
  // };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const configDocRef = doc(db, "app_config", "costs");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          setCosts(configSnap.data() as JobCosts);
        }
        const categoriesQuery = await getDocs(collection(db, "categories"));
        setCategories(categoriesQuery.docs.map(doc => doc.data().name as string).sort());
        getStates().then(setStates);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedState) {
      getCitiesByState(selectedState.id).then(setCities);
    }
  }, [selectedState]);

  useEffect(() => {
    if (!costs) return;

    let currentCost = 0;
    const durationValue = parseInt(durationDays?.replace(' dias', '') || '1', 10);
    
    const isBaseFree = hasFreePosts && !isUpgradingFromFree && durationValue === 1 && !isHighlighted;
    
    if (isBaseFree) {
      currentCost = 0;
    } else {
      let costForExtras = 0;
      if (isHighlighted) {
        costForExtras += costs.highlightJobCost;
      }
      if (durationValue > 1) {
        const extraDays = durationValue - 1;
        costForExtras += extraDays * costs.costPerExtraDay;
      }

      const baseCost = hasFreePosts && !isUpgradingFromFree ? 0 : costs.postJobBaseCost;
      currentCost = baseCost + costForExtras;
    }

    setTotalCost(currentCost);
  }, [durationDays, isHighlighted, costs, hasFreePosts, isUpgradingFromFree]);

  const handleStateChange = (stateName: string) => {
    const state = states.find(s => s.nome === stateName);
    setSelectedState(state || null);
    setSelectedCity(null);
    setCities([]);
  };
  
  const showUpgradeModal = (onConfirm: () => void, onCancel: () => void) => {
    showModal({
      title: "Adicionar Extras?",
      message: `Você tem direito a uma vaga gratuita de 1 dia. Adicionar destaque ou mais dias consumirá moedas da sua carteira. Deseja continuar e pagar pelos extras?`,
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: onCancel },
        { text: "Continuar", style: "default", onPress: onConfirm }
      ]
    });
  };

  const handleHighlightToggle = (value: boolean) => {
    if (hasFreePosts && value && !isUpgradingFromFree) {
      showUpgradeModal(
        () => {
          setIsHighlighted(true);
          setIsUpgradingFromFree(true);
        },
        () => {
          setIsHighlighted(false);
        }
      );
    } else {
      setIsHighlighted(value);
      if (!value && durationDays === '1 dia') {
        setIsUpgradingFromFree(false);
      }
    }
  };

  const handleDurationChange = (value: string) => {
    const isChangingToMoreThanOneDay = value !== '1 dia';
    if (hasFreePosts && isChangingToMoreThanOneDay && !isUpgradingFromFree) {
      showUpgradeModal(
        () => {
          setDurationDays(value);
          setIsUpgradingFromFree(true);
        },
        () => {
          setDurationDays('1 dia');
        }
      );
    } else {
      setDurationDays(value);
      if (value === '1 dia' && !isHighlighted) {
        setIsUpgradingFromFree(false);
      }
    }
  };

  const handlePostJob = async () => {
    if (!title || !description || !category || !selectedState || !selectedCity) {
      showModal({ title: "Formulário Incompleto", message: "Por favor, preencha todos os campos obrigatórios.", buttons: [{ text: "OK", onPress: () => {} }]});
      return;
    }

    if ((userProfile?.walletBalance ?? 0) < totalCost) {
      showModal({ title: "Saldo Insuficiente", message: `Você precisa de ${totalCost} moedas para postar esta vaga.`, buttons: [ { text: "OK", style: "cancel", onPress: () => {} }, { text: "Recarregar", onPress: () => router.push('/wallet') } ]});
      return;
    }
    
    setIsPosting(true);
    try {
      const functions = getFunctions();
      const postJob = httpsCallable(functions, 'postJob');
      
      await postJob({
        title, description, category,
        location: { city: selectedCity, state: selectedState.sigla },
        durationDays: parseInt(durationDays?.replace(' dias', '') || '1', 10),
        isHighlighted, budget: budget || "A combinar", isNegotiable,
        useFreePost: hasFreePosts,
      });

      await refreshUserProfile();
      showModal({ title: "Sucesso!", message: "Sua vaga foi publicada.", buttons: [{ text: "OK", onPress: () => router.back() }]});
    } catch (error: any) {
      console.error("Erro ao postar vaga:", error);
      showModal({ title: "Erro", message: `Não foi possível postar a vaga: ${error.message}`, buttons: [{ text: "OK", onPress: () => {} }]});
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Criar Nova Vaga' }} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Detalhes do Serviço</Text>
        <Input label="Título da Vaga" placeholder="Ex: Pintor para apartamento" value={title} onChangeText={setTitle} />
        <Input label="Descrição Completa" placeholder="Detalhe o serviço que você precisa..." value={description} onChangeText={setDescription} multiline style={{ height: 120, textAlignVertical: 'top' }}/>
        <Picker label="Categoria" placeholder="Selecione a categoria do serviço" selectedValue={category} options={categories} onValueChange={setCategory} />
        <Text style={styles.headerTitle}>Localização</Text>
        <Picker label="Estado" placeholder="Selecione o estado" selectedValue={selectedState?.nome || null} options={states.map(s => s.nome)} onValueChange={handleStateChange} />
        <Picker label="Cidade" placeholder="Selecione a cidade" selectedValue={selectedCity} options={cities.map(c => c.nome)} onValueChange={setSelectedCity} disabled={!selectedState} />
        <Text style={styles.headerTitle}>Orçamento</Text>
        <Input label="Orçamento Médio (Opcional)" placeholder="Ex: R$ 250,00 ou A combinar" value={budget} onChangeText={setBudget} />
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Valor negociável?</Text>
          <Switch onValueChange={setIsNegotiable} value={isNegotiable} />
        </View>
        <Text style={styles.headerTitle}>Opções da Vaga</Text>
        <Picker 
          label="Duração da Vaga" 
          placeholder="Selecione a duração"
          selectedValue={durationDays}
          onValueChange={handleDurationChange}
          options={ALL_DURATION_OPTIONS}
        />
        <View style={styles.switchContainer}>
          <View>
            <Text style={styles.switchLabel}>Destacar Vaga</Text>
            <Text style={styles.switchSubLabel}>Sua vaga no topo por +{costs?.highlightJobCost} moedas</Text>
          </View>
          <Switch onValueChange={handleHighlightToggle} value={isHighlighted} />
        </View>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>Custo Total:</Text>
          {hasFreePosts && totalCost === 0 ? (
            <Text style={styles.freeText}>GRÁTIS (Cota Semanal)</Text>
          ) : (
            <View style={styles.costContainer}>
              <Ionicons name="logo-bitcoin" size={24} color={theme.colors.primary} />
              <Text style={styles.costText}>{totalCost} moedas</Text>
            </View>
          )}
        </View>
        <View style={styles.quotaContainer}>
          <Text style={styles.quotaText}>
            {freePostsAvailable} postagens gratuitas restantes esta semana.
          </Text>
          {userProfile?.dailyFreePosts?.lastReset && (
            <CountdownTimer targetDate={getNextMondayMidnight()} />
          )}
        </View>
        <Button title="Publicar Vaga" onPress={handlePostJob} isLoading={isPosting} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { padding: theme.spacing.lg, paddingBottom: 50 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md, marginTop: theme.spacing.lg },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginVertical: theme.spacing.sm, borderWidth: 1, borderColor: '#f0f0f0' },
  switchLabel: { fontSize: 16, fontWeight: '500' },
  switchSubLabel: { fontSize: 12, color: theme.colors.secondary },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.md, marginVertical: theme.spacing.lg, backgroundColor: '#eef2ff', borderRadius: theme.borderRadius.md },
  summaryText: { fontSize: 16, fontWeight: 'bold' },
  costContainer: { flexDirection: 'row', alignItems: 'center' },
  costText: { fontSize: 20, fontWeight: 'bold', color: theme.colors.primary, marginLeft: theme.spacing.sm },
  freeText: { fontSize: 20, fontWeight: 'bold', color: '#28a745' },
  quotaContainer: { alignItems: 'center', marginBottom: theme.spacing.lg },
  quotaText: { fontSize: 14, color: theme.colors.secondary },
});
