/**
 * Theme utility functions for consistent styling across components
 */

import { cn } from './utils';

export const getNavigationClass = (isScrolled: boolean = false) => {
  return cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    isScrolled
      ? 'bg-black/95 backdrop-blur-md border-b border-gold/20 shadow-lg'
      : 'bg-transparent'
  );
};

export const getButtonClass = (variant: 'primary' | 'secondary' | 'success' = 'primary') => {
  const baseClasses = 'px-6 py-2 rounded-lg font-semibold transition-all duration-200';
  
  if (variant === 'primary') {
    return cn(
      baseClasses,
      'bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-yellow-400 hover:to-gold shadow-lg hover:shadow-gold/50'
    );
  }
  
  if (variant === 'success') {
    return cn(
      baseClasses,
      'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 shadow-lg hover:shadow-green-500/50'
    );
  }
  
  return cn(
    baseClasses,
    'bg-transparent border-2 border-gold text-gold hover:bg-gold hover:text-black'
  );
};

export const getSectionClass = () => {
  return 'py-20 bg-gradient-to-br from-black via-purple-950 to-black';
};

export const getCardClass = () => {
  return 'bg-black/60 backdrop-blur-sm rounded-xl border border-gold/20 p-6 hover:border-gold/40 transition-all duration-300';
};

export const getInputClass = () => {
  return 'w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-gold focus:outline-none transition-colors';
};

export const getLabelClass = () => {
  return 'block text-sm font-medium text-gray-300 mb-2';
};

export const getErrorClass = () => {
  return 'text-red-400 text-sm mt-1';
};

export const getGradientClass = () => {
  return 'bg-gradient-to-br from-black via-purple-950 to-black';
};
