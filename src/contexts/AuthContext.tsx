import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  arrayUnion,
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  query, 
  setDoc,
  Timestamp, 
  where 
} from "firebase/firestore";
import { KeyboardAvoidingView, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { auth, db } from "../services/firebaseConfig";
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return ({
      shouldShowBanner: true,
      shouldPlaySound: false,
      shouldShowList: false,
    } as any);
  },
});

export type NotificationType = 'vaga' | 'candidatura' | 'chat' | 'review' | 'sistema' | 'promocao' | 'carteira';


export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  cpf?: string;
  profileCompleted?: boolean;
  profileType?: "professional" | "professional-premium" | "contractor";
  profession?: string;
  bio?: string;
  phone?: string;
  address?: {
    city: string;
    state: string;
  };
  displayNameLastChanged?: Timestamp;
  isPremium?: boolean;
  viewCountLast7Days?: number;
  website?: string;
  linkedin?: string;
  instagram?: string;
  dailyViews?: { [key: string]: number };
  hasPortfolio?: boolean;
  walletBalance?: number;
  premiumExpiresAt?: Timestamp;
  favoritedJobs?: string[];
  pushTokens?: string[];
  status?: 'active' | 'deactivated';
  deactivatedAt?: Timestamp;
  dailyFreePosts?: {
    count: number;
    lastReset: Timestamp;
  };
  dailyFreeApplications?: {
    count: number;
    lastReset: Timestamp;
  };
  notificationPreferences?: {
    [key in NotificationType]?: boolean;
  };
  appliedJobs?: string[];
  blockedUsers?: string[];
}

interface AuthContextData {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  unreadNotifications: number;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Busca o perfil do usuário logado no Firestore
  const fetchUserProfile = async (currentUser: User | null): Promise<UserProfile | null> => {
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          // CPF fica em users/{uid}/private/account (só o dono lê). Junta ao perfil em memória.
          try {
            const privateSnap = await getDoc(doc(db, "users", currentUser.uid, "private", "account"));
            const cpf = privateSnap.exists() ? privateSnap.data().cpf : undefined;
            if (cpf) profile.cpf = cpf;
          } catch (err) {
            console.warn("Não foi possível ler os dados privados do usuário:", err);
          }
          return profile;
        }
      } catch (err) {
        console.error("Erro ao buscar perfil do usuário:", err);
      }
    }
    return null;
  };

  // Listener principal de autenticação + notificações não lidas
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      const profile = await fetchUserProfile(currentUser);
      setUserProfile(profile);
      setIsLoading(false);
    });

    let unsubscribeNotifications: () => void = () => {};
    if (user) {
      const notificationsRef = collection(db, "users", user.uid, "notifications");
      const q = query(notificationsRef, where("isRead", "==", false));
      unsubscribeNotifications = onSnapshot(q, (snapshot) => {
        setUnreadNotifications(snapshot.size);
      });
    } else {
      setUnreadNotifications(0);
    }

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications();
    };
  }, [user]);

  // Registrar Push Token (expo)
  useEffect(() => {
    const registerForPushNotifications = async (currentUser: User) => {
      if (!Device.isDevice) {
        console.log("Notificações push só funcionam em dispositivos físicos.");
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Permissão para notificações não concedida.");
        return;
      }

      try {
        // O projectId do EAS vem do app.config.js (EAS_PROJECT_ID). Sem ele, o push fica desligado.
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.log("EAS projectId não configurado: push desativado neste ambiente.");
          return;
        }
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

        if (token) {
          // Tokens de push ficam num documento privado (só o dono lê/escreve),
          // para não ficarem expostos junto do perfil público.
          const privateDocRef = doc(db, "users", currentUser.uid, "private", "account");
          await setDoc(privateDocRef, {
            pushTokens: arrayUnion(token),
          }, { merge: true });
          console.log("Push token salvo com sucesso:", token);
        }
      } catch (error) {
        console.error("Erro ao obter ou salvar o push token:", error);
      }

      if (Platform.OS === 'android') {
        return (
          <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f4f4f8' }}
            behavior="height"
          >
            {children}
          </KeyboardAvoidingView>
        );
      }
    };

    if (user) {
      registerForPushNotifications(user);
    }
  }, [user]);

  const refreshUserProfile = async () => {
    const profile = await fetchUserProfile(user);
    setUserProfile(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        unreadNotifications,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
