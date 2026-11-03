// Configuração do Expo. Identificadores de projeto (EAS, Firebase nativo) vêm
// de variáveis de ambiente, para que nenhum id real fique no repositório.
const easProjectId = process.env.EAS_PROJECT_ID;

module.exports = {
  expo: {
    name: 'ProConecta',
    slug: 'proconecta',
    version: '2.0.0',
    orientation: 'portrait',
    scheme: 'proconecta',
    userInterfaceStyle: 'automatic',
    icon: './assets/images/app-icon.png',
    splash: {
      image: './assets/images/splash-logo.png',
      resizeMode: 'contain',
      backgroundColor: '#F38001',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'com.example.proconecta',
      infoPlist: {
        NSCameraUsageDescription: 'Este aplicativo precisa de acesso à câmera para permitir que você envie fotos no chat e no seu portfólio.',
        NSPhotoLibraryUsageDescription: 'Este aplicativo precisa de acesso à sua galeria para permitir que você escolha fotos e vídeos para o chat e seu portfólio.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      softwareKeyboardLayoutMode: 'resize',
      package: process.env.ANDROID_PACKAGE || 'com.example.proconecta',
      // Necessário só para builds nativos com push (FCM). Baixe o seu do console do Firebase.
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-splash-screen',
      'expo-secure-store',
      'expo-audio',
      'expo-video',
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
  },
};
