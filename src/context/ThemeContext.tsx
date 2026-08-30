import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from '../constants/colors';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    AsyncStorage.getItem('cv_theme').then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    AsyncStorage.setItem('cv_theme', t);
  };

  const colorScheme: 'light' | 'dark' =
    theme === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : theme;
  const isDark = colorScheme === 'dark';
  const colors: ThemeColors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, colors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
