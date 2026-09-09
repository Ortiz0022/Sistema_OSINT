import { useThemeContext } from '../context/ThemeContext';
import type { ThemeContextValue } from '../types/theme.types';

export const useTheme = (): ThemeContextValue => {
  return useThemeContext();
};

export default useTheme;
