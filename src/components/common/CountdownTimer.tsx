import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../styles/theme';

interface Props {
  targetDate: Date;
}

export const CountdownTimer = ({ targetDate }: Props) => {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const pad = (num: number) => num.toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Próximo reset em: {timeLeft.days}d: {pad(timeLeft.hours)}h: {pad(timeLeft.minutes)}m: {pad(timeLeft.seconds)}s
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  text: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});