import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { FavoriteJobsTab } from '../components/profile/FavoriteJobsTab';
import { MyJobsTab } from '../components/profile/MyJobsTab';
import { ProfileInfoTab } from '../components/profile/ProfileInfoTab';
import { PillTabSelector } from '../components/common/PillTabSelector';
import { AppliedJobsTab } from '../components/profile/AppliedJobsTab';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

export default function ProfileScreen() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  const isProfessional =
    userProfile?.profileType === 'professional' ||
    userProfile?.profileType === 'professional-premium';

  const availableTabs = useMemo(() => {
    const tabs = [{ key: 'info', title: 'Informações' }];

    if (isProfessional) {
      tabs.push({ key: 'applied-jobs', title: 'Minhas Candidaturas' });
    }

    tabs.push({ key: 'my-jobs', title: 'Minhas Vagas' });

    return tabs;
  }, [isProfessional]);

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return <ProfileInfoTab />;
      case 'applied-jobs':
        return <AppliedJobsTab />;
      case 'my-jobs':
        return <MyJobsTab />;
      default:
        return <ProfileInfoTab />;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <PillTabSelector
          tabs={availableTabs}
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />
      </SafeAreaView>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  headerSafeArea: {
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
