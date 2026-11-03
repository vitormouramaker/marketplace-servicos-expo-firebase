import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Tab {
  key: string;
  title: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export const PillTabSelector = ({ tabs, activeTab, onTabPress }: Props) => {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.chip, activeTab === tab.key && styles.activeChip]}
            onPress={() => onTabPress(tab.key)}
          >
            <Text style={[styles.chipText, activeTab === tab.key && styles.activeChipText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    backgroundColor: '#fff5e0ff',
  },
  activeChip: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  activeChipText: {
    color: theme.colors.white,
  },
});
