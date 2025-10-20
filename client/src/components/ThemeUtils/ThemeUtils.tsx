import { cn } from '../../lib/utils';

// Theme constants
export const themeColors = {
  primary: 'gold',
  secondary: 'white',
  success: 'green-500',
  danger: 'red-500',
  warning: 'yellow-500',
  info: 'blue-500',
  background: 'bg-gradient-to-b from-gray-900 to-black',
  card: 'bg-gray-800/50 backdrop-blur-sm border border-gray-700',
  cardHover: 'hover:-translate-y-1.25 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]',
};

// Theme utility functions
export const getButtonClass = (variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' = 'primary') => {
  const baseClasses = 'px-6 py-3 rounded-full font-semibold transition-colors duration-200';
  
  switch (variant) {
    case 'primary':
      return cn(baseClasses, 'bg-gold text-black hover:bg-yellow-400');
    case 'secondary':
      return cn(baseClasses, 'bg-white text-black hover:bg-gray-200');
    case 'success':
      return cn(baseClasses, 'bg-green-600 text-white hover:bg-green-700');
    case 'danger':
      return cn(baseClasses, 'bg-red-600 text-white hover:bg-red-700');
    case 'warning':
      return cn(baseClasses, 'bg-yellow-600 text-black hover:bg-yellow-700');
    case 'info':
      return cn(baseClasses, 'bg-blue-600 text-white hover:bg-blue-700');
    default:
      return baseClasses;
  }
};

// Theme utility for cards
export const getCardClass = (type: 'default' | 'success' | 'danger' | 'warning' | 'info' = 'default') => {
  const baseClasses = 'rounded-xl backdrop-blur-sm p-6';
  
  switch (type) {
    case 'default':
      return cn(baseClasses, 'bg-gray-800/50 border border-gray-700');
    case 'success':
      return cn(baseClasses, 'bg-gray-800/50 border border-[rgba(40,167,69,0.5)]');
    case 'danger':
      return cn(baseClasses, 'bg-gray-800/50 border border-[rgba(220,53,69,0.5)]');
    case 'warning':
      return cn(baseClasses, 'bg-gray-800/50 border border-[rgba(255,193,7,0.5)]');
    case 'info':
      return cn(baseClasses, 'bg-gray-800/50 border border-[rgba(23,162,184,0.5)]');
    default:
      return baseClasses;
  }
};

// Theme utility for inputs
export const getInputClass = (error?: boolean) => {
  const baseClasses = 'w-full px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 transition-colors duration-200';
  const defaultClasses = 'bg-gray-700/50 border border-gray-600 focus:ring-gold';
  const errorClasses = 'bg-red-900/20 border border-red-600 focus:ring-red-500';
  
  return cn(baseClasses, error ? errorClasses : defaultClasses);
};

// Theme utility for section styling
export const getSectionClass = (withPadding: boolean = true) => {
  const paddingClass = withPadding ? 'py-20' : '';
  return cn(
    paddingClass,
    'relative overflow-hidden'
  );
};

// Theme utility for container styling
export const getContainerClass = () => {
  return cn(
    'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'
  );
};

// Theme utility for section titles
export const getSectionTitleClass = () => {
  return cn(
    'text-4xl font-bold text-center text-gold mb-12'
  );
};

// Theme utility for navigation styling
export const getNavigationClass = (scrolled: boolean = false) => {
  return cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    scrolled 
      ? 'bg-black/90 backdrop-blur-md py-2.5 shadow-lg' 
      : 'bg-transparent py-4'
  );
};

// Theme utility for mobile menu styling
export const getMobileMenuClass = (isOpen: boolean = false) => {
  return cn(
    'fixed inset-0 z-40 lg:hidden transition-all duration-300',
    isOpen 
      ? 'bg-black/95 backdrop-blur-md opacity-100 visible' 
      : 'bg-transparent opacity-0 invisible'
  );
};

// Theme utility for gradient backgrounds
export const getGradientClass = (variant: 'default' | 'andar' | 'bahar' | 'admin' = 'default') => {
  switch (variant) {
    case 'default':
      return 'bg-gradient-to-br from-gray-900 to-black';
    case 'andar':
      return 'bg-andar-gradient';
    case 'bahar':
      return 'bg-bahar-gradient';
    case 'admin':
      return 'bg-admin-gradient';
    default:
      return 'bg-gradient-to-br from-gray-900 to-black';
  }
};

// Theme utility for text colors
export const getTextClass = (variant: 'primary' | 'secondary' | 'muted' | 'accent' = 'primary') => {
  switch (variant) {
    case 'primary':
      return 'text-white';
    case 'secondary':
      return 'text-gray-200';
    case 'muted':
      return 'text-gray-400';
    case 'accent':
      return 'text-gold';
    default:
      return 'text-white';
  }
};

// Theme utility for shadows
export const getShadowClass = (variant: 'card' | 'card-hover' | 'gold-glow' | 'timer' = 'card') => {
  switch (variant) {
    case 'card':
      return 'shadow-card-shadow';
    case 'card-hover':
      return 'shadow-card-shadow-hover';
    case 'gold-glow':
      return 'shadow-gold-glow';
    case 'timer':
      return 'shadow-timer-shadow';
    default:
      return 'shadow-card-shadow';
  }
};
