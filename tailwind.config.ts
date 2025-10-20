// tailwind.config.ts
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
        'gold-light': '#FFED4E',
        'gold-dark': '#DAA520',
        primary: {
          DEFAULT: '#FFD700',
          light: '#FFED4E',
          dark: '#DAA520',
        },
        secondary: {
          DEFAULT: '#8B5CF6',
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        accent: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
        },
        muted: {
          DEFAULT: '#6B7280',
          light: '#9CA3AF',
          dark: '#4B5563',
        },
        background: {
          DEFAULT: '#0F0F0F',
          light: '#1A1A1A',
          dark: '#000000',
        },
        card: {
          DEFAULT: '#1A1A1A',
          light: '#2A2A2A',
          dark: '#0A0A0A',
        },
        border: {
          DEFAULT: '#374151',
          light: '#4B5563',
          dark: '#1F2937',
        },
        input: {
          DEFAULT: '#1F2937',
          light: '#374151',
          dark: '#111827',
        },
        ring: '#FFD700',
        destructive: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FCD34D',
          dark: '#D97706',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
        },
      },
      // Custom shadow utilities for casino-themed effects
      boxShadow: {
        'gold-glow': '0 0 15px rgba(255, 215, 0, 0.3)',
        'card-shadow': '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
        'card-shadow-hover': '0 8px 32px rgba(255, 215, 0, 0.5), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
        'timer-shadow': '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)',
      },
      // Custom gradient utilities
      backgroundImage: {
        'card-gradient': 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        'gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        'andar-gradient': 'linear-gradient(135deg, #A52A2A 0%, #8B0000 100%)',
        'bahar-gradient': 'linear-gradient(135deg, #01073b 0%, #1E3A8A 100%)',
        'admin-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%)',
        'modal-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%)',
      },
      // Custom transition utilities
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'transform-opacity': 'transform, opacity',
      },
      // Custom animation utilities for real-time sync
      animation: {
        'pulse-gold': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-live': 'pulseLive 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-win': 'pulseWin 1s ease-in-out infinite',
        'win-glow': 'winGlow 1s ease-in-out infinite',
      },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseWin: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.9)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 215, 0, 1)' },
        },
        winGlow: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.9)' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 30px rgba(255, 215, 0, 1)' },
        },
      },
      // Custom spacing scale for casino game elements
      spacing: {
        '1.25': '0.3125rem', // 5px
        '2.5': '0.625rem',   // 10px
        '3.75': '0.9375rem', // 15px
        '7.5': '1.875rem',   // 30px
        '8.75': '2.1875rem', // 35px
        '10': '2.5rem',      // 40px
        '11.25': '2.8125rem',// 45px
        '12.5': '3.125rem',  // 50px
        '13.75': '3.4375rem',// 55px
        '15': '3.75rem',     // 60px
        '16.25': '4.0625rem',// 65px
        '17.5': '4.375rem',  // 70px
        '18.75': '4.6875rem',// 75px
        '20': '5rem',        // 80px
        '22.5': '5.625rem',  // 90px
        '25': '6.25rem',     // 100px
        '30': '7.5rem',      // 120px
        '35': '8.75rem',     // 140px
        '40': '10rem',       // 160px
        '50': '12.5rem',     // 200px
      },
      // Custom border width for casino game elements
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '8': '8px',
      },
      // Custom z-index for game elements
      zIndex: {
        '100': '100',
        '500': '500',
        '1000': '1000',
      }
    },
  },
  plugins: [
    tailwindcssAnimate, 
    typography
  ],
} satisfies Config;
