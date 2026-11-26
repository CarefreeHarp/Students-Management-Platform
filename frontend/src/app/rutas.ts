import { Route, Routes } from '@angular/router';
import { authGuard, projectGuard } from './auth';
import * as Paginas from './pages/paginas';

function pagina(path: string, component: Route['component'], page: string, script: string,
                title: string, options: { protected?: boolean; project?: boolean; bodyClass?: string; view?: string } = {}): Route {
  return {
    path,
    component,
    title: title + ' · StudyFlow',
    canActivate: options.project ? [authGuard, projectGuard] : options.protected ? [authGuard] : [],
    data: { page, script, bodyClass: options.bodyClass, view: options.view },
    runGuardsAndResolvers: 'paramsOrQueryParamsChange'
  };
}

const privada = { protected: true };
const proyecto = { project: true };

export const rutas: Routes = [
  pagina('', Paginas.Landing, 'landing', 'landing', 'StudyFlow', { view: 'landing' }),
  { path: 'planes', title: 'Planes · StudyFlow', loadComponent: () => import('./pages/planes').then(m => m.Planes) },
  { path: 'planes/confirmar/:plan', title: 'Revisar plan · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.ConfirmarPlan) },
  { path: 'planes/resultado', title: 'Resultado del pago · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.ResultadoPago) },
  { path: 'mi-plan', title: 'Mi plan · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.MiPlan) },
  pagina('login', Paginas.Login, 'login', 'login', 'Ingresa', { bodyClass: 'entry-page' }),
  { path: 'admin', title: 'Administración · StudyFlow', loadComponent: () => import('./pages/admin').then(m => m.Admin) },
  pagina('registro', Paginas.Registro, 'registro', 'registro', 'Crea tu cuenta'),
  pagina('invitacion', Paginas.Invitacion, 'invitacion', 'invitacion', 'Invitación'),
  pagina('sandbox', Paginas.Sandbox, 'sandbox', 'sandbox', 'Tu espacio de prueba', { view: 'sandbox' }),
  pagina('paleta', Paginas.Paleta, 'paleta', 'paleta', 'Paleta', { bodyClass: 'bg-canvas' }),
  pagina('panel', Paginas.Panel, 'dashboard', 'dashboard', 'Inicio', privada),
  pagina('perfil/editar', Paginas.EditarPerfil, 'perfil', 'perfil', 'Editar perfil', privada),
  pagina('perfil', Paginas.Perfil, 'perfil', 'perfil', 'Mi perfil', privada),
  pagina('horarios', Paginas.Horarios, 'schedule', 'crear-horario', 'Horarios', privada),
  pagina('recordatorios', Paginas.Recordatorios, 'recordatorios', 'recordatorios', 'Recordatorios', privada),
  pagina('proyectos/nuevo', Paginas.CrearProyecto, 'crear-proyecto', 'crear-proyecto', 'Crear proyecto', privada),
  pagina('proyectos/:codigo/canales', Paginas.Canales, 'canales', 'canales', 'Canales', proyecto),
  pagina('proyectos/:codigo/fases', Paginas.Fases, 'fases', 'fases', 'Fases', proyecto),
  pagina('proyectos/:codigo/entregables', Paginas.Entregables, 'entregables', 'entregables', 'Entregables', proyecto),
  pagina('proyectos/:codigo', Paginas.Proyecto, 'project', 'proyecto', 'Proyecto', proyecto),
  pagina('proyectos', Paginas.Proyectos, 'projects', 'proyectos', 'Mis proyectos', privada),
  { path: 'chats', redirectTo: 'proyectos', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
