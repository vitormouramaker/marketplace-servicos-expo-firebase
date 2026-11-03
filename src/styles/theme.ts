export const theme = {
  colors: {
    primary: '#F38001',
    secondary: '#FF952C',
    secondaryLight: '#FFD8B1',
    background: '#f8f4f0ff',
    text: '#D36400',
    white: '#FFFFFF',
    error: '#E53E3E',
    lightGray: '#e0bd99ff',
    placeholder: '#fcb369ff',
    danger: '#c51e1eff',
  },
  spacing: {
    xsm: 3,
    sm: 8,
    md: 16,
    lg: 24,
    xs: 4,
    xl: 40,
    xxl: 50,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    title: {
      fontSize: 26,
      fontWeight: 'bold',
    } as const, 
    body: {
      fontSize: 16,
    },
  },
};