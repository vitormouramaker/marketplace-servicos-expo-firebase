// app/_layout.tsx

import { SplashScreen, Stack } from "expo-router";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import { CustomSplashScreen } from "../src/components/common/CustomSplashScreen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ModalProvider } from "../src/contexts/ModalContext";
import { StandardModal } from "../src/components/common/modal/StandardModal";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading } = useAuth();
  const [isTimeElapsed, setTimeElapsed] = useState(false);
  
  // 1. estado para controlar se a splash deve ESTAR visível na árvore de componentes.
  const [isSplashScreenVisible, setSplashScreenVisible] = useState(true);
  
  // 2. estado para dizer à splash para INICIAR o fade-out.
  const [startFadeOut, setStartFadeOut] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
    const timer = setTimeout(() => {
      setTimeElapsed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 3. Verificar quando o app está pronto (dados carregados E tempo mínimo passou)
  const isAppReady = !isLoading && isTimeElapsed;

  useEffect(() => {
    if (isAppReady) {
      // 4. Quando o app estiver pronto, aciona o início do fade-out.
      setStartFadeOut(true);
    }
  }, [isAppReady]);

  // Se a splash não estiver mais visível, mostre o app.
  if (!isSplashScreenVisible) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    );
  }

  // Se a splash AINDA estiver visível, renderize-a com as props de controle.
  return (
    <CustomSplashScreen
      isFadingOut={startFadeOut}
      onFadeOutComplete={() => setSplashScreenVisible(false)} // 5. Quando a animação acabar, remove a splash da tela.
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ModalProvider>
          <RootLayoutNav />
          <StandardModal />
        </ModalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}