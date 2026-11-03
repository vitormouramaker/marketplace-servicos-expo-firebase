import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserProfile } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';

interface Props {
  profile: UserProfile;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ProfileViewsChart = ({ profile }: Props) => {
  const dailyViews = profile.dailyViews || {};

  const chartData = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    const dateString = date.toISOString().split('T')[0];
    const dayOfWeek = WEEKDAYS[date.getDay()];
    
    chartData.push({
      label: dayOfWeek,
      value: dailyViews[dateString] || 0,
    });
  }

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visualizações nos Últimos 7 Dias</Text>
      <View style={styles.chartContainer}>
        {chartData.map((day, index) => (
          <View key={index} style={styles.barWrapper}>
            <Text style={styles.barValue}>{day.value}</Text>
            <View style={styles.barContainer}>
              <View 
                style={[styles.bar, { height: `${(day.value / maxValue) * 100}%` }]} 
              />
            </View>
            <Text style={styles.barLabel}>{day.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 150,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barContainer: {
    height: 100,
    width: 25,
    backgroundColor: '#ffe9d2ff',
    borderRadius: 5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: theme.colors.primary,
  },
  barLabel: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.secondary,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    height: 20,
  },
});