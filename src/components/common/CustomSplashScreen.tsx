import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
 
interface CustomSplashScreenProps {
  isFadingOut: boolean;
  onFadeOutComplete: () => void;
}

export const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({
  isFadingOut,
  onFadeOutComplete,
}) => {

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFadingOut) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFadeOutComplete();
      });
    }
  }, [isFadingOut, onFadeOutComplete, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../../../assets/images/logo-screen.png')}
        style={styles.logo}
      />
      <Text style={styles.poweredByText}>
        Marketplace de serviços
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F38001',
  },
  logo: {
    width: '30%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  poweredByText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 1)',
    fontWeight: '500',
  },
});