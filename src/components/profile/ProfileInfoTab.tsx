import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../services/firebaseConfig';
import { uploadImageAndGetURL } from '../../services/storageService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { theme } from '../../styles/theme';
import { getUsernameFromUrl } from '../../utils/urlHelper';
import { EditInfoModal } from './EditInfoModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { EditLocationModal } from './EditLocationModal';
import { ProfileViewsChart } from './ProfileViewsChart';
import { useModal } from '../../contexts/ModalContext';


const InfoRow = ({ icon, label, value, onEdit, onCopy, editable = true, isPremium = false }: { 
  icon: keyof typeof Ionicons.glyphMap, 
  label: string, 
  value: string, 
  onEdit?: () => void,
  onCopy?: () => void,
  editable?: boolean, 
  isPremium?: boolean 
}) => {
  return (
    <View style={[styles.infoBox, isPremium && styles.infoBoxPremium]}>
      <Ionicons name={icon} size={24} color={isPremium ? '#ffecd7ff' : theme.colors.primary} style={styles.icon} />
      <View style={styles.infoTextContainer}>
        <Text style={[styles.label, isPremium && styles.labelPremium]}>{label}</Text>
        <Text style={[styles.value, isPremium && styles.valuePremium]}>{value}</Text>
      </View>
      <View style={styles.buttonsContainer}>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} style={styles.actionButton}>
            <Ionicons name="copy-outline" size={20} color={isPremium ? '#ffecd7ff' : theme.colors.secondary} />
          </TouchableOpacity>
        )}
        {editable && (
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <Ionicons name="pencil" size={20} color={isPremium ? '#ffecd7ff' : theme.colors.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

type EditingFieldType = {
  field: 'displayName' | 'email' | 'phone' | 'website' | 'linkedin' | 'instagram';
  title: string;
};

export const ProfileInfoTab = () => {
  const router = useRouter(); 
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { showModal } = useModal();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditingFieldType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const isUserPremium = userProfile?.isPremium || false;

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showModal({
        title: "Permissão Necessária",
        message: "É preciso permitir o acesso à sua galeria de fotos.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled) {
      return;
    }

    const uri = pickerResult.assets[0].uri;
    if (uri && user) {
      setIsUploading(true);
      try {
        const downloadURL = await uploadImageAndGetURL(uri, user.uid);
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          photoURL: downloadURL,
        });
        await refreshUserProfile();
        showModal({
          title: "Sucesso!",
          message: "Sua foto de perfil foi atualizada.",
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } catch (error) {
        console.error("Erro no upload da imagem de perfil:", error);
        showModal({
          title: "Erro",
          message: "Não foi possível atualizar sua foto de perfil.",
          buttons: [{ text: 'OK', onPress: () => {} }]
        });
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const handleCopy = async (textToCopy: string | undefined) => {
    if (!textToCopy || textToCopy === 'Não informado') {
      showModal({
        title: "Nada para copiar",
        message: "Este campo não possui informação.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
      return;
    }
    await Clipboard.setStringAsync(textToCopy);
    showModal({
      title: "Copiado!",
      message: "A informação foi copiada para a área de transferência.",
      buttons: [{ text: 'OK', onPress: () => {} }]
    });
  };

  const handleEdit = (field: EditingFieldType['field'], title: string) => {
    setEditingField({ field, title });
    setModalVisible(true);
  };

  const handleSave = async (newValue: string) => {
    if (!user || !editingField) return;

    let finalValue = newValue.trim();

    if (editingField.field === 'instagram' && finalValue) {
      finalValue = `https://www.instagram.com/${finalValue}`;
    } else if (editingField.field === 'linkedin' && finalValue) {
      finalValue = `https://www.linkedin.com/in/${finalValue}`;
    }

    if (editingField.field === 'displayName') {
      const lastChanged = userProfile?.displayNameLastChanged?.toDate();
      if (lastChanged) {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        if (lastChanged > fifteenDaysAgo) {
          showModal({
            title: "Aguarde",
            message: "Você só pode alterar seu nome a cada 15 dias.",
            buttons: [{ text: 'OK', onPress: () => {} }]
          });
          return;
        }
      }
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const dataToUpdate: { [key: string]: any } = {
        [editingField.field]: finalValue,
      };

      if (editingField.field === 'displayName') {
        dataToUpdate.displayNameLastChanged = serverTimestamp();
      }

      await updateDoc(userDocRef, dataToUpdate);
      await refreshUserProfile();
      setModalVisible(false);
      setEditingField(null);
      showModal({
        title: "Sucesso!",
        message: "Sua informação foi atualizada.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      showModal({
        title: "Erro",
        message: "Não foi possível salvar a alteração.",
        buttons: [{ text: 'OK', onPress: () => {} }]
      });
    }
  };

  const handleSignOut = async () => {
    await auth.signOut();
  };
  

  const handleDeleteAccountPress = () => {
    setIsDeleteModalVisible(true);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={isUserPremium ? ['#F38001', '#D36400'] : ['#ffeedcff', '#ffeedcff']}
          style={[styles.avatarSection, isUserPremium && styles.avatarSectionPremium]}
        >
          <TouchableOpacity onPress={handleImagePick} disabled={isUploading}>
            <View style={styles.avatarContainer}>
                {userProfile?.photoURL ? (
                  <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={50} color={isUserPremium ? theme.colors.white : theme.colors.primary} />
                    <View style={styles.cameraIconBadge}>
                      <Ionicons name="camera" size={16} color={theme.colors.primary} />
                    </View>
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color="white" />
                  </View>
                )}
            </View>
          </TouchableOpacity>
          {isUserPremium && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          )}
          <Text style={[styles.displayName, isUserPremium && styles.displayNamePremium]}>{userProfile?.displayName}</Text>
          <Text style={[styles.profession, isUserPremium && styles.professionPremium]}>{userProfile?.profession || 'Profissão não informada'}</Text>
        </LinearGradient>

        {isUserPremium && userProfile && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Desempenho do Perfil</Text>
            <ProfileViewsChart profile={userProfile} />
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          <InfoRow icon="person-outline" label="Nome de Exibição" value={userProfile?.displayName || ''} onEdit={() => handleEdit('displayName', 'Nome de Exibição')} isPremium={isUserPremium} />
          <InfoRow icon="mail-outline" label="E-mail" value={userProfile?.email || ''} onEdit={() => handleEdit('email', 'E-mail')} isPremium={isUserPremium} onCopy={() => handleCopy(userProfile?.email)} />
          <InfoRow icon="call-outline" label="Telefone" value={userProfile?.phone || 'Não informado'} onEdit={() => handleEdit('phone', 'Telefone')} isPremium={isUserPremium} onCopy={() => handleCopy(userProfile?.phone)}/>
          <InfoRow 
            icon="location-outline" 
            label="Localização" 
            value={`${userProfile?.address?.city || 'Não informada'}, ${userProfile?.address?.state || ''}`} 
            onEdit={() => setIsLocationModalVisible(true)}
            isPremium={isUserPremium} 
          />
          <InfoRow icon="document-text-outline" label="CPF" value={userProfile?.cpf ? `***.${userProfile.cpf.substring(3, 6)}.${userProfile.cpf.substring(6, 9)}-**` : 'Não informado'} editable={false} isPremium={isUserPremium} />
        </View>

        {isUserPremium && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Links Profissionais</Text>
            <InfoRow icon="globe-outline" label="Website / Portfólio" value={userProfile?.website || 'Não informado'} onEdit={() => handleEdit('website', 'Website / Portfólio')} isPremium={isUserPremium} onCopy={() => handleCopy(userProfile?.website)} />
            <InfoRow icon="logo-linkedin" label="LinkedIn" value={getUsernameFromUrl(userProfile?.linkedin) || 'Não informado'} onEdit={() => handleEdit('linkedin', 'LinkedIn')} isPremium={isUserPremium} onCopy={() => handleCopy(userProfile?.linkedin)} />
            <InfoRow icon="logo-instagram" label="Instagram" value={getUsernameFromUrl(userProfile?.instagram) || 'Não informado'} onEdit={() => handleEdit('instagram', 'Instagram')} isPremium={isUserPremium} onCopy={() => handleCopy(userProfile?.instagram)} />
          </View>
        )}

        <TouchableOpacity style={[styles.signOutButton, styles.signOutButton]} onPress={handleDeleteAccountPress}>
          <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Excluir Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
          <Text style={styles.signOutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>

      {editingField && (
        <EditInfoModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
          title={editingField.title}
          initialValue={
            editingField.field === 'instagram' ? getUsernameFromUrl(userProfile?.instagram) :
            editingField.field === 'linkedin' ? getUsernameFromUrl(userProfile?.linkedin) :
            userProfile?.[editingField.field] || ''
          }
          warningMessage={editingField.field === 'displayName' ? "Por questões de segurança, seu nome só poderá ser alterado a cada 15 dias." : undefined}
          infoMessage={
            (editingField.field === 'instagram' || editingField.field === 'linkedin') 
            ? 'Digite apenas o seu nome de usuário.' 
            : undefined
          }
          inputPrefix={
            editingField.field === 'instagram' ? 'instagram.com/' :
            editingField.field === 'linkedin' ? 'linkedin.com/in/' :
            undefined
          }
          keyboardType={
            editingField.field === 'phone' ? 'phone-pad' : 
            (editingField.field === 'instagram' || editingField.field === 'linkedin' || editingField.field === 'website') ? 'url' : 
            'default'
          }
          autoCapitalize={
            editingField.field === 'displayName' ? 'words' : 'none'
          }
        />
      )}
      
      <EditLocationModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
      />
      <DeleteAccountModal 
        visible={isDeleteModalVisible}
        onClose={() => setIsDeleteModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  avatarSection: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  avatarSectionPremium: {
    paddingBottom: theme.spacing.xxl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: 'lightgrey'
  },
  avatarPlaceholder: {
    backgroundColor: '#ffecd7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 6,
    borderWidth: 1,
    borderColor: '#eee'
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 14,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  displayNamePremium: {
    color: theme.colors.white,
  },
  profession: {
    fontSize: 16,
    color: theme.colors.secondary,
  },
  professionPremium: {
    color: '#ffeedcff',
  },
  infoSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffecd7ff',
  },
  infoBoxPremium: {
    backgroundColor: '#F38001',
    borderColor: 'rgba(255, 195, 126, 0.3)',
  },
  icon: { marginRight: theme.spacing.md },
  infoTextContainer: { flex: 1 },
  label: { color: theme.colors.secondary, fontSize: 12 },
  labelPremium: { color: '#ffdab2ff' },
  value: { color: theme.colors.text, fontSize: 16, fontWeight: '500' },
  valuePremium: { color: theme.colors.white },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: { 
    padding: 12,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    textAlign: 'center', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: theme.spacing.sm 
  },
  signOutButton: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#fff0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe0e0',
    marginHorizontal: theme.spacing.lg,
  },
  signOutText: { color: theme.colors.error, textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.sm },
});