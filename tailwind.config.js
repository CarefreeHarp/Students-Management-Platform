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
  /* El modo oscuro se activa con la clase .dark en <html>, no por preferencia
     del sistema, para que el interruptor de la barra pueda mandar sobre ella. */
  darkMode: 'class',
  theme: {
    extend: {
      /*
       * Los colores que cambian entre modos no son un hex fijo sino los canales
       * RGB de una variable, declarada en tailwind.css para claro y oscuro.
       * Se escriben como `rgb(var(--x) / <alpha-value>)` y no como `var(--x)`
       * a secas para no perder los modificadores de opacidad: sin esa forma,
       * `bg-primary-soft/40` o `text-muted/70` dejarían de funcionar.
       *
       * Los colores de marca (primary, success, warning, danger, cyan) se
       * mantienen fijos: son la identidad y valen igual sobre claro y oscuro.
       */
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--c-muted) / <alpha-value>)',
          light: 'rgb(var(--c-muted-light) / <alpha-value>)'
        },
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        primary: {
          DEFAULT: '#5b5ce2',
          dark: '#4546c9',
          soft: 'rgb(var(--c-primary-soft) / <alpha-value>)'
        },
        cyan: { DEFAULT: '#19a7bd' },
        success: { DEFAULT: '#32a876', soft: 'rgb(var(--c-success-soft) / <alpha-value>)' },
        warning: { DEFAULT: '#f2ae3d', soft: 'rgb(var(--c-warning-soft) / <alpha-value>)' },
        danger: { DEFAULT: '#e76472', soft: 'rgb(var(--c-danger-soft) / <alpha-value>)' }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"DM Sans"', 'sans-serif']
      },
      /* Radios contenidos: el rediseño usa esquinas suaves, no cápsulas. */
      borderRadius: {
        sm: '10px',
        DEFAULT: '12px',
        lg: '16px'
      },
      /*
       * El rediseño se apoya en bordes finos, no en relieve: las sombras bajan
       * a un apoyo mínimo y solo los elementos flotantes (menús, diálogos)
       * conservan una sombra de verdad.
       */
      boxShadow: {
        sm: '0 1px 2px rgba(32, 30, 44, .04)',
        DEFAULT: '0 1px 2px rgba(32, 30, 44, .05), 0 2px 6px rgba(32, 30, 44, .04)',
        tarjeta: '0 1px 2px rgba(32, 30, 44, .04)',
        alta: '0 2px 6px rgba(32, 30, 44, .06), 0 8px 20px rgba(32, 30, 44, .07)',
        barra: '0 1px 0 rgba(32, 30, 44, .04)',
        pop: '0 16px 44px rgba(20, 18, 34, .18)'
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
