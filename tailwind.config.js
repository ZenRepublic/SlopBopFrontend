/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Spacing scale matching design system
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '48px',
      },

      // Brand + semantic colors
      colors: {
        'blue-main': '#5041E7',
        'blue-secondary': '#6E63E7',
        'yellow': '#FEEE31',
        'red': '#FF2F1F',
        'black': '#050511',
        'white': '#FFFFFF',
        'gray': '#a8a7a7',

        'primary': '#5041E7',
        'secondary': '#6E63E7',
        'success': '#5041E7',
        'warning': '#FEEE31',
        'error': '#FF2F1F',
        'info': '#6E63E7',

        'bg-primary': '#050511',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#0A0A0A',
        'bg-surface': '#333333',
        'bg-input': '#1A1A1A',

        'text-primary': '#FFFFFF',
        'text-secondary': '#a8a7a7',
        'text-muted': '#666666',
        'text-dark': '#050511',

        'border-default': '#333333',
        'border-dark': '#1A1A1A',
      },

      // Font families
      fontFamily: {
        'display': ["'Xirod'", 'sans-serif'],
        'body': ["'Masicu'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'Roboto'", 'sans-serif'],
      },

      // Font sizes
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '40px',
      },

      // Font weights
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },

      // Shadows
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.4)',
        'xl': '0 12px 24px rgba(0, 0, 0, 0.5)',
      },

      // Border radius
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '50%',
      },

      // Z-index
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '500',
        'modal': '1000',
        'tooltip': '1100',
        'notification': '1200',
      },

      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },

      // Border widths
      borderWidth: {
        'xs': '1px',
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      },
    },
  },
  plugins: [],
}
