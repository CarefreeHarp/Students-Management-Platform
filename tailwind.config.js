/**
 * Configuración de Tailwind para StudyFlow.
 * La paleta reproduce exactamente las variables CSS del diseño original
 * (antes en css/estilos-generales.css) para conservar la identidad visual.
 */
module.exports = {
  content: [
    './src/main/resources/templates/**/*.html',
    './src/main/resources/static/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#182338',
        muted: { DEFAULT: '#6f7890', light: '#a4abc0' },
        canvas: '#f5f7fc',
        line: '#e7eaf2',
        primary: {
          DEFAULT: '#5b5ce2',
          dark: '#4546c9',
          soft: '#eeeeff'
        },
        cyan: { DEFAULT: '#19a7bd' },
        success: { DEFAULT: '#32a876', soft: '#e9f8f1' },
        warning: { DEFAULT: '#f2ae3d', soft: '#fff6e6' },
        danger: { DEFAULT: '#e76472', soft: '#fff0f1' }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"DM Sans"', 'sans-serif']
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '18px',
        lg: '24px'
      },
      boxShadow: {
        sm: '0 4px 14px rgba(30, 41, 70, .05)',
        DEFAULT: '0 16px 40px rgba(38, 47, 84, .09)',
        pop: '0 25px 65px rgba(16, 27, 60, .28)'
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateY(12px)', opacity: '0' } },
        'slide-out': { to: { transform: 'translateY(12px)', opacity: '0' } }
      },
      animation: {
        'slide-in': 'slide-in .25s ease both',
        'slide-out': 'slide-out .25s ease both'
      }
    }
  },
  plugins: []
};
