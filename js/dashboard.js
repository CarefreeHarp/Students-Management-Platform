(function () {
  'use strict';
  const DAYS = [
    { key: '2026-08-10', name: 'Lun', number: '10' }, { key: '2026-08-11', name: 'Mar', number: '11' },
    { key: '2026-08-12', name: 'Mié', number: '12' }, { key: '2026-08-13', name: 'Jue', number: '13' },
    { key: '2026-08-14', name: 'Vie', number: '14' }
  ];
  const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const getTasks = () => App.getProjects().flatMap(project => (project.tasks || []).map(task => ({ ...task, project })));

  function renderCalendar(tasks) {
    const holder = document.getElementById('dashboard-calendar');
    if (!holder) return;
    const eventMap = new Map();
    tasks.forEach(task => eventMap.set(`${task.dueDate}-${task.time || '09:00'}`, task));
    let html = `<div class="calendar-shell"><div class="calendar-toolbar"><h2>Semana del 10 al 14 de agosto</h2><div class="calendar-actions"><button class="calendar-button" type="button" aria-label="Semana anterior"><i class="bi bi-chevron-left"></i></button><button class="calendar-button" type="button" aria-label="Semana siguiente"><i class="bi bi-chevron-right"></i></button></div></div><div class="week-calendar"><div class="calendar-grid"><div class="calendar-corner"></div>`;
    html += DAYS.map(day => `<div class="calendar-day-head ${day.key === '2026-08-12' ? 'today' : ''}">${day.name}<strong>${day.number}</strong></div>`).join('');
    HOURS.forEach(hour => {
      html += `<div class="calendar-hour">${hour}</div>`;
      DAYS.forEach(day => {
        const task = eventMap.get(`${day.key}-${hour}`);
        html += `<div class="calendar-slot">${task ? eventMarkup(task) : ''}</div>`;
      });
    });
    html += '</div></div></div>';
    holder.innerHTML = html;
    holder.querySelectorAll('.calendar-event').forEach(bindEventPopover);
  }
  function eventMarkup(task) {
    const data = encodeURIComponent(JSON.stringify({
      title: task.title, project: task.project.name, assignee: task.assignee, date: task.dueDate, status: task.status, id: task.project.id
    }));
    return `<a class="calendar-event" href="proyecto.html?id=${encodeURIComponent(task.project.id)}" data-task="${data}" style="--event-color:${App.escapeHTML(task.project.color || '#5b5ce2')}">${App.escapeHTML(task.title)}<small>${App.escapeHTML(task.project.name)}</small></a>`;
  }
  function bindEventPopover(event) {
    let popover;
    const show = () => {
      const task = JSON.parse(decodeURIComponent(event.dataset.task));
      popover = document.createElement('div'); popover.className = 'calendar-popover';
      popover.innerHTML = `<strong>${App.escapeHTML(task.title)}</strong><p><i class="bi bi-kanban"></i>${App.escapeHTML(task.project)}</p><p><i class="bi bi-person"></i>${App.escapeHTML(task.assignee || 'Sin asignar')}</p><p><i class="bi bi-calendar3"></i>${App.formatDate(task.date)} · <span class="status ${App.statusClass(task.status)}">${App.statusLabel(task.status)}</span></p>`;
      document.body.append(popover);
      const rect = event.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 242, Math.max(12, rect.left));
      const top = rect.bottom + 8 > window.innerHeight - 120 ? rect.top - popover.offsetHeight - 8 : rect.bottom + 8;
      popover.style.left = `${left}px`; popover.style.top = `${Math.max(8, top)}px`;
    };
    const hide = () => { popover?.remove(); popover = null; };
    event.addEventListener('mouseenter', show); event.addEventListener('mouseleave', hide);
    event.addEventListener('focus', show); event.addEventListener('blur', hide);
  }
  function renderData() {
    const user = App.getUser();
    document.querySelectorAll('[data-user-first-name]').forEach(node => { node.textContent = user.firstName || user.name.split(' ')[0]; });
    const projects = App.getProjects();
    const tasks = getTasks();
    const unfinished = tasks.filter(task => task.status !== 'done');
    const done = tasks.filter(task => task.status === 'done');
    const percent = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
    document.getElementById('pending-count').textContent = `${unfinished.length} tarea${unfinished.length === 1 ? '' : 's'} pendientes`;
    document.getElementById('completion-score').textContent = `${percent}%`;
    document.getElementById('completion-progress').style.width = `${percent}%`;
    document.getElementById('completion-caption').textContent = percent >= 60 ? '¡Vas muy bien esta semana!' : 'Cada pequeña tarea cuenta.';
    document.getElementById('project-legend').innerHTML = projects.slice(0, 4).map(project => `<span class="legend-item"><i class="legend-dot" style="background:${App.escapeHTML(project.color || '#5b5ce2')}"></i>${App.escapeHTML(project.name)}</span>`).join('');
    document.getElementById('upcoming-tasks').innerHTML = unfinished.sort((a,b) => `${a.dueDate}${a.time}`.localeCompare(`${b.dueDate}${b.time}`)).slice(0, 4).map(task => `<div class="upcoming-task"><i class="upcoming-color" style="--task-color:${App.escapeHTML(task.project.color || '#5b5ce2')}"></i><div><a href="proyecto.html?id=${encodeURIComponent(task.project.id)}">${App.escapeHTML(task.title)}</a><span>${App.escapeHTML(task.project.name)} · ${App.formatDate(task.dueDate)}</span></div></div>`).join('') || '<p class="muted">No hay tareas próximas.</p>';
    document.getElementById('project-snapshot-list').innerHTML = projects.slice(0, 3).map(project => { const progress = App.getProgress(project); return `<div class="snapshot-row"><i class="snapshot-line" style="--project-color:${App.escapeHTML(project.color || '#5b5ce2')}"></i><div><a href="proyecto.html?id=${encodeURIComponent(project.id)}">${App.escapeHTML(project.name)}</a><small>Entrega ${App.formatDate(project.dueDate)}</small></div><span class="snapshot-percent">${progress}%</span></div>`; }).join('') || '<p class="muted">Crea tu primer proyecto.</p>';
    renderCalendar(tasks);
  }
  function openCompletionForm() {
    const pending = getTasks().filter(task => task.status !== 'done');
    if (!pending.length) { App.showToast('Todo al día', 'No tienes tareas pendientes para marcar.'); return; }
    const modal = App.showModal(`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="complete-modal-title"><div class="modal-header"><h2 id="complete-modal-title">Registrar tarea terminada</h2><button class="modal-close" type="button" data-close-modal aria-label="Cerrar"><i class="bi bi-x-lg"></i></button></div><form id="complete-task-form"><div class="modal-body"><div class="form-group"><label for="completed-task">¿Qué tarea terminaste?</label><select id="completed-task" required><option value="">Selecciona una tarea</option>${pending.map(task => `<option value="${App.escapeHTML(task.project.id)}::${App.escapeHTML(task.id)}">${App.escapeHTML(task.title)} — ${App.escapeHTML(task.project.name)}</option>`).join('')}</select></div><div class="form-group" style="margin-top:14px"><label for="complete-note">Nota de avance <span class="muted">(opcional)</span></label><textarea id="complete-note" placeholder="¿Qué quedó listo?"></textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit"><i class="bi bi-check2"></i> Marcar completada</button></div></form></section>`);
    modal.element.querySelector('#complete-task-form').addEventListener('submit', event => {
      event.preventDefault(); const [projectId, taskId] = new FormData(event.currentTarget).get('completed-task').split('::');
      const projects = App.getProjects(); const project = projects.find(item => item.id === projectId); const task = project?.tasks.find(item => item.id === taskId);
      if (!task) return;
      task.status = 'done'; App.updateProjectProgress(project); App.saveProjects(projects); modal.close(); App.showToast('¡Avance registrado!', `“${task.title}” quedó como completada.`); renderData();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'dashboard') return;
    document.getElementById('dashboard-date').textContent = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(2026, 7, 12));
    renderData(); document.getElementById('open-complete-task')?.addEventListener('click', openCompletionForm);
  });
})();
