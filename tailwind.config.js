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
      borderRadius: {
        sm: '12px',
        DEFAULT: '18px',
        lg: '24px'
      },
      /*
       * Elevación por niveles en lugar de una sombra única y plana. Cada nivel
       * combina un contacto corto (define el borde) con una sombra larga y muy
       * suave (separa del fondo); apilarlas da profundidad sin ensuciar.
       */
      boxShadow: {
        sm: '0 1px 2px rgba(22, 32, 58, .05), 0 2px 6px rgba(22, 32, 58, .04)',
        DEFAULT: '0 1px 2px rgba(22, 32, 58, .06), 0 8px 18px rgba(38, 47, 84, .08)',
        /*
         * Nivel propio de las tarjetas. Cuatro capas en vez de dos: el contacto
         * dibuja el canto, las intermedias dan volumen y la última proyecta la
         * tarjeta sobre la página. Con `sm` se confundían con el fondo, porque
         * su base (#f1f3fb) queda a un paso del fondo del documento (#f4f6fc).
         */
        tarjeta: '0 1px 1px rgba(22, 32, 58, .07), 0 3px 6px rgba(38, 47, 84, .07), 0 10px 20px rgba(38, 47, 84, .10), 0 22px 40px rgba(38, 47, 84, .07)',
        alta: '0 2px 4px rgba(22, 32, 58, .06), 0 18px 36px rgba(38, 47, 84, .14)',
        barra: '0 1px 0 rgba(22, 32, 58, .04), 0 8px 24px rgba(38, 47, 84, .07)',
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
