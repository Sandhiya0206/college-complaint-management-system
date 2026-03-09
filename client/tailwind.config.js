/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace']
      },
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA'
        },
        ai: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'slide-right': 'slideRight 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'bounce-in': 'bounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        'new-row': 'newRow 2.5s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: 'calc(400px + 100%) 0' } },
        bounceIn: { '0%': { transform: 'scale(0.94)', opacity: '0' }, '60%': { transform: 'scale(1.01)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        newRow: { '0%,5%': { backgroundColor: '#fef9c3' }, '100%': { backgroundColor: 'transparent' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        glow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' }, '50%': { boxShadow: '0 0 20px 4px rgba(99,102,241,0.2)' } },
      }
    }
  },
  plugins: []
}
