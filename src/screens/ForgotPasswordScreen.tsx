import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { auth } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { isEmailValid } from '../utils/validators';
import { useModal } from '../contexts/ModalContext';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { showModal } = useModal();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!isEmailValid(email)) {
      showModal({
        title: "E-mail Inválido",
        message: "Por favor, insira um endereço de e-mail válido.",
        buttons: [{ text: "OK", onPress: () => {} }]
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      
      showModal({
        title: "Verifique seu E-mail",
        message: `Um link para redefinição de senha foi enviado para ${email}.`,
        buttons: [{ text: "OK", onPress: () => router.back() }]
      });

    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error.code);
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nenhuma conta encontrada com este endereço de e-mail.";
      }
      showModal({
        title: "Erro",
        message: errorMessage,
        buttons: [{ text: "OK", onPress: () => {} }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Recuperar Senha</Text>
            <Text style={styles.subtitle}>
              Insira seu e-mail para enviarmos um link de redefinição.
            </Text>

            <Input
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Button 
              title="Enviar Link" 
              onPress={handlePasswordReset} 
              isLoading={isLoading} 
            />

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Voltar para o Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});