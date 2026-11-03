import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaskedTextInput } from "react-native-mask-text";
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { PasswordStrengthIndicator } from '../components/common/PasswordStrengthIndicator';
import { auth, db } from '../services/firebaseConfig';
import { theme } from '../styles/theme';
import { isCpfValid, isEmailValid, validatePassword } from '../utils/validators';
import { useModal } from '../contexts/ModalContext';

export function SignUpScreen() {
  const router = useRouter();
  const { showModal } = useModal();
  
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cpfError, setCpfError] = useState('');

  const passwordValidations = useMemo(() => validatePassword(password), [password]);
  const isFormValid = useMemo(() => {
    const { hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar, isLengthValid } = passwordValidations;
    const isPasswordStrong = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLengthValid;
    return fullName && displayName && isCpfValid(cpf) && isEmailValid(email) && isPasswordStrong;
  }, [fullName, displayName, cpf, email, passwordValidations]);

  const validateCpfRealtime = (text: string) => {
    setCpf(text);
    if (text.replace(/\D/g, '').length === 11) {
      if (!isCpfValid(text)) {
        setCpfError('CPF inválido.');
      } else {
        setCpfError('');
      }
    } else {
      setCpfError('');
    }
  };

  const handleSignUp = async () => {
    if (cpfError) {
      showModal({
        title: "CPF Inválido",
        message: "Por favor, insira um CPF matematicamente válido para continuar.",
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
      return;
    }
    if (!isFormValid) {
      showModal({
        title: "Formulário Incompleto",
        message: "Por favor, preencha todos os campos corretamente e garanta que a senha atende aos critérios de segurança.",
        buttons: [{ text: 'OK', onPress: () => {} }],
      });
      return;
    }
    
    setIsLoading(true);
    const formattedCpf = cpf.replace(/\D/g, '');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // Reserva o CPF. As regras só permitem CRIAR o documento (nunca ler nem
        // sobrescrever), então um CPF já cadastrado faz esta escrita falhar.
        const cpfRef = doc(db, "cpf_references", formattedCpf);
        try {
          await setDoc(cpfRef, { userId: user.uid });
        } catch {
          await deleteUser(user).catch(() => {});
          showModal({
            title: "Erro",
            message: "Este CPF já está cadastrado.",
            buttons: [{ text: 'OK', onPress: () => {} }],
          });
          return;
        }

        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          fullName,
          displayName,
          email,
          createdAt: new Date(),
          walletBalance: 0,
        });
        // Dado pessoal sensível: fica no documento privado, legível só pelo dono.
        await setDoc(doc(db, "users", user.uid, "private", "account"), { cpf: formattedCpf }, { merge: true });
      }
      router.replace('/(app)');
    } catch (error: any) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
      }
      showModal({
        title: 'Erro no Cadastro',
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Crie sua Conta</Text>
            <Text style={styles.subtitle}>É rápido e fácil!</Text>
            <Input label="Nome Completo" value={fullName} onChangeText={setFullName} />
            <Input label="Nome de Exibição (como aparecerá no app)" value={displayName} onChangeText={setDisplayName} />
            
            <Text style={styles.label}>CPF</Text>
            <MaskedTextInput
              mask="999.999.999-99"
              onChangeText={validateCpfRealtime}
              value={cpf}
              keyboardType="numeric"
              style={[styles.input, !!cpfError && styles.inputError]}
            />
            {!!cpfError && <Text style={styles.errorText}>{cpfError}</Text>}

            <Input label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
            
            <PasswordStrengthIndicator validations={passwordValidations} />
            <Button title="Cadastrar" onPress={handleSignUp} isLoading={isLoading} disabled={!isFormValid} />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Já tem uma conta?</Text>
              <TouchableOpacity onPress={() => router.back()}><Text style={styles.loginLink}> Faça Login</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: theme.spacing.lg },
  content: { paddingHorizontal: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.secondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.lg },
  loginText: { color: theme.colors.text, fontSize: 15 },
  loginLink: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 15 },
  label: { marginBottom: theme.spacing.sm, color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  input: { height: 50, borderWidth: 1, borderColor: theme.colors.lightGray, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.white, fontSize: 16, color: theme.colors.text, marginBottom: theme.spacing.md },
  inputError: { borderColor: theme.colors.error },
  errorText: { marginTop: -theme.spacing.md + 5, marginBottom: theme.spacing.sm, color: theme.colors.error, fontSize: 12 },
});