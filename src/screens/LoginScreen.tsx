import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Dimensions, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Checkbox } from '../components/common/Checkbox';
import { Input } from '../components/common/Input';
import { auth } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { useModal } from '../contexts/ModalContext';

const { width } = Dimensions.get("window");
const CREDENTIALS_KEY = 'userCredentials';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showModal } = useModal();

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const credentialsJson = await SecureStore.getItemAsync(CREDENTIALS_KEY);
        if (credentialsJson) {
          const { email: savedEmail, password: savedPassword } = JSON.parse(credentialsJson);
          setEmail(savedEmail);
setPassword(savedPassword);
        }
      } catch (error) {
        console.log('Erro ao carregar credenciais.', error);
      }
    };
    loadCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showModal({
        title: 'Atenção',
        message: 'Preencha e-mail e senha.',
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (rememberMe) {
        await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }));
      } else {
        await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      }
      router.replace('/(app)' as any);
    } catch (error: any) {
      console.error('Erro no login:', error.code);
      let errorMessage = 'Ocorreu um erro ao tentar fazer login.';

      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'E-mail ou senha inválidos.';
      }
      
      showModal({
        title: 'Erro no Login',
        message: errorMessage,
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('../../assets/images/logo-login.png')}
                style={styles.logo}
              />
              <Text style={styles.title}>Bem-vindo(a)!</Text>
              <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>
            </View>
            <View style={{ marginBottom: -30 }}>
              <Input
                placeholder="Digite seu e-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={{ marginBottom: theme.spacing.md }}>
              <Input
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <View style={styles.actionsContainer}>
              <Checkbox label="Lembrar dados" value={rememberMe} onValueChange={setRememberMe} />
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
                <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>
            <Button title="Entrar" onPress={handleLogin} isLoading={isLoading} />
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Não tem uma conta?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
                <Text style={styles.signupLink}> Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch'
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    width: '100%'
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: -30
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25,
    maxWidth: 150,
    maxHeight: 150,
    resizeMode: "contain",
    marginBottom: theme.spacing.lg,
    alignSelf: "center",
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    width: '100%'
  },
  forgotPassword: {
    color: theme.colors.primary,
    fontWeight: '500'
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg
  },
  signupText: {
    color: theme.colors.text,
    fontSize: 15
  },
  signupLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 15
  }
});