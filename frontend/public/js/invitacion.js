export function mount(scope) {
  const { document, request, navigate } = scope;
  const token = location.hash.slice(1);
  const feedback = document.getElementById('invitation-feedback');
  const join = document.getElementById('invitation-join');
  const create = document.getElementById('invitation-register');

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    join.hidden = true;
    create.hidden = true;
    feedback.textContent = 'Este enlace de invitación no es válido.';
    return;
  }

  create.href = '/registro?volver=%2Finvitacion#' + token;
  join.addEventListener('click', async () => {
    join.disabled = true;
    feedback.textContent = '';
    try {
      const response = await request('/api/invitaciones/aceptar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token })
      });
      if (response.status === 401) {
        navigate('/login?acceso=cuenta&volver=%2Finvitacion#' + token);
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'No fue posible aceptar la invitación.');
      navigate('/proyectos/' + encodeURIComponent(result.codigo));
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      join.disabled = false;
    }
  });
}
