/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    // ==========================================
    // SPACING SYSTEM (8pt Grid)
    // ==========================================
    spacing: {
      '0': '0px',
      '0.5': '2px',
      '1': '4px',
      '2': '8px',
      '3': '12px',
      '4': '16px',
      '5': '20px',
      '6': '24px',
      '8': '32px',
      '10': '40px',
      '12': '48px',
      '16': '64px',
      '20': '80px',
      '24': '96px',
      '32': '128px',
      '40': '160px',
      '48': '192px',
      '56': '224px',
      '64': '256px',
    },

    extend: {
      // ==========================================
      // COLOR TOKENS
      // ==========================================
      colors: {
        // Primary Brand Colors - AccuDocs Blue Theme v2
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F1E35',
          950: '#081529',
          DEFAULT: '#1D4ED8',
        },
        // Secondary Colors - Neutral Slate
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          DEFAULT: '#64748b',
        },
        // Semantic Colors
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#166534',
          700: '#14532D',
          800: '#0F3F24',
          900: '#0B2E1A',
          950: '#052E16',
          DEFAULT: '#166534',
        },
        warning: {
          50: '#fff8e1',
          100: '#fef3cd',
          200: '#fae29a',
          300: '#f3cc5f',
          400: '#eab72c',
          500: '#e1a800',
          600: '#b88300',
          700: '#856404',
          800: '#674d03',
          900: '#4c3902',
          950: '#2f2301',
          DEFAULT: '#e1a800',
        },
        danger: {
          50: '#fdecea',
          100: '#fbd7d3',
          200: '#f4aaa2',
          300: '#ec7f74',
          400: '#df554a',
          500: '#c53030',
          600: '#a22525',
          700: '#831f1f',
          800: '#681b1b',
          900: '#501515',
          950: '#2d0b0b',
          DEFAULT: '#c53030',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F1E35',
          950: '#081529',
          DEFAULT: '#1D4ED8',
        },
        // Legacy utility aliases used across older modules.
        blue: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F1E35',
          950: '#081529',
          DEFAULT: '#1D4ED8',
        },
        indigo: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#0F1E35',
          950: '#081529',
          DEFAULT: '#1D4ED8',
        },
        // Surface Colors (CSS Variables for theming)
        surface: 'var(--surface-color)',
        background: 'var(--background-color)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-color': 'var(--border-color)',
        'border-subtle': 'var(--border-subtle)',
        accent: {
          DEFAULT: 'var(--accent-color)',
          hover: 'var(--accent-hover)',
        },
      },

      // ==========================================
      // TYPOGRAPHY SYSTEM
      // ==========================================
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0' }],
        'sm': ['13px', { lineHeight: '18px', letterSpacing: '0' }],
        'base': ['14px', { lineHeight: '20px', letterSpacing: '0' }],
        'lg': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'xl': ['18px', { lineHeight: '26px', letterSpacing: '0' }],
        '2xl': ['22px', { lineHeight: '30px', letterSpacing: '0' }],
        '3xl': ['28px', { lineHeight: '36px', letterSpacing: '0' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '0' }],
        '5xl': ['44px', { lineHeight: '48px', letterSpacing: '0' }],
        'display': ['56px', { lineHeight: '1', letterSpacing: '0' }],
      },

      // ==========================================
      // BORDER RADIUS SYSTEM
      // ==========================================
      borderRadius: {
        'none': '0',
        'DEFAULT': '8px',
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        'full': '9999px',
      },

      // ==========================================
      // SHADOW SYSTEM
      // ==========================================
      boxShadow: {
        'none': 'none',
        'xs': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'sm': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'DEFAULT': '0 4px 12px rgba(15, 23, 42, 0.05)',
        'md': '0 4px 12px rgba(15, 23, 42, 0.05)',
        'lg': '0 10px 25px rgba(15, 23, 42, 0.08)',
        'xl': '0 18px 40px rgba(15, 23, 42, 0.12)',
        '2xl': '0 24px 56px rgba(15, 23, 42, 0.16)',
        // Component-specific shadows
        'card': '0 4px 12px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 10px 25px rgba(15, 23, 42, 0.08)',
        'dropdown': '0 10px 25px rgba(15, 23, 42, 0.08)',
        'modal': '0 18px 50px rgba(15, 23, 42, 0.18)',
        'button': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'button-hover': '0 4px 12px rgba(15, 23, 42, 0.08)',
        'input-focus': '0 0 0 3px var(--ring-color)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Primary color shadows for emphasis
        'primary': '0 10px 20px -10px rgba(29, 78, 216, 0.36)',
        'success': '0 10px 20px -10px rgba(22, 101, 52, 0.32)',
        'danger': '0 10px 20px -10px rgba(197, 48, 48, 0.32)',
      },

      // ==========================================
      // ANIMATION SYSTEM
      // ==========================================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.22s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',
        'modal-overlay-in': 'modalOverlayIn 0.2s ease-out both',
        'modal-panel-in': 'modalPanelIn 0.22s ease-out both',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.96)', opacity: '0' },
        },
        modalOverlayIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        modalPanelIn: {
          '0%': { transform: 'scale(0.96) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ==========================================
      // TRANSITION SYSTEM
      // ==========================================
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ==========================================
      // Z-INDEX SYSTEM
      // ==========================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '100',
        'sticky': '200',
        'header': '300',
        'sidebar': '400',
        'modal-backdrop': '500',
        'modal': '510',
        'popover': '600',
        'tooltip': '700',
        'toast': '800',
        'max': '9999',
      },

      // ==========================================
      // LAYOUT SYSTEM
      // ==========================================
      maxWidth: {
        'container': '1440px',
        'content': '1200px',
        'form': '640px',
        'modal-sm': '400px',
        'modal-md': '560px',
        'modal-lg': '720px',
        'modal-xl': '900px',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - 60px)',
      },

      // ==========================================
      // ASPECT RATIOS
      // ==========================================
      aspectRatio: {
        'card': '4 / 3',
        'video': '16 / 9',
        'square': '1 / 1',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for component utilities
    function ({ addUtilities, addComponents, theme }) {
      // Focus ring utility
      addUtilities({
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 3px var(--ring-color, ${theme('colors.primary.200')})`,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px var(--ring-color, ${theme('colors.primary.200')})`,
          },
        },
        '.focus-ring-offset': {
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 2px white, 0 0 0 4px var(--ring-color, ${theme('colors.primary.500')})`,
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 2px white, 0 0 0 4px var(--ring-color, ${theme('colors.primary.500')})`,
          },
        },
        // Scrollbar utilities
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
        },
        '.scrollbar-hidden': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        // Glass morphism
        '.glass': {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        '.glass-dark': {
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        // Skeleton loading
        '.skeleton': {
          backgroundColor: theme('colors.secondary.200'),
          backgroundImage: `linear-gradient(90deg, ${theme('colors.secondary.200')}, ${theme('colors.secondary.100')}, ${theme('colors.secondary.200')})`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite',
        },
      });

      // Component classes
      addComponents({
        // Container component
        '.container-app': {
          width: '100%',
          maxWidth: theme('maxWidth.container'),
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          '@screen md': {
            paddingLeft: theme('spacing.6'),
            paddingRight: theme('spacing.6'),
          },
          '@screen lg': {
            paddingLeft: theme('spacing.8'),
            paddingRight: theme('spacing.8'),
          },
        },
        // Truncate text with ellipsis
        '.truncate-2': {
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
        '.truncate-3': {
          display: '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
        },
      });
    },
  ],
}
