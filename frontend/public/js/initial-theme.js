(() => {
  try {
    const tema = localStorage.getItem('studyflow-tema');
    document.documentElement.classList.toggle('dark',
      tema ? tema === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (_) { /* El tema claro queda disponible sin almacenamiento. */ }
})();
