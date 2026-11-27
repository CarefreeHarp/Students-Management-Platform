import { t } from './idioma';
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
  { path: 'planes', title: t('landing.planes') + ' · StudyFlow', loadComponent: () => import('./pages/planes').then(m => m.Planes) },
  { path: 'planes/confirmar/:plan', title: t('rutas.revisar_plan') + ' · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.ConfirmarPlan) },
  { path: 'planes/resultado', title: t('rutas.resultado_del_pago') + ' · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.ResultadoPago) },
  { path: 'mi-plan', title: t('main.mi_plan') + ' · StudyFlow', canActivate: [authGuard], loadComponent: () => import('./pages/planes').then(m => m.MiPlan) },
  pagina('login', Paginas.Login, 'login', 'login', t("landing.ingresa"), { bodyClass: 'entry-page' }),
  { path: 'admin', title: t('admin.administracion') + ' · StudyFlow', loadComponent: () => import('./pages/admin').then(m => m.Admin) },
  pagina('registro', Paginas.Registro, 'registro', 'registro', t("registro.crea_tu_cuenta")),
  pagina('invitacion', Paginas.Invitacion, 'invitacion', 'invitacion', t("rutas.invitacion")),
  pagina('sandbox', Paginas.Sandbox, 'sandbox', 'sandbox', t("rutas.tu_espacio_de_prueba"), { view: 'sandbox' }),
  pagina('paleta', Paginas.Paleta, 'paleta', 'paleta', t("rutas.paleta"), { bodyClass: 'bg-canvas' }),
  pagina('panel', Paginas.Panel, 'dashboard', 'dashboard', t("main.inicio"), privada),
  pagina('perfil/editar', Paginas.EditarPerfil, 'perfil', 'perfil', t("perfil.editar_perfil"), privada),
  pagina('perfil', Paginas.Perfil, 'perfil', 'perfil', t("rutas.mi_perfil"), privada),
  pagina('horarios', Paginas.Horarios, 'schedule', 'crear-horario', t("main.horarios"), privada),
  pagina('recordatorios', Paginas.Recordatorios, 'recordatorios', 'recordatorios', t("recordatorios.recordatorios"), privada),
  pagina('proyectos/nuevo', Paginas.CrearProyecto, 'crear-proyecto', 'crear-proyecto', t("proyectos.crear_proyecto"), privada),
  pagina('proyectos/:codigo/canales', Paginas.Canales, "canales", "canales", t("canales.canales"), proyecto),
  pagina('proyectos/:codigo/fases', Paginas.Fases, 'fases', 'fases', t("recorrido.fases"), proyecto),
  pagina('proyectos/:codigo/entregables', Paginas.Entregables, 'entregables', 'entregables', t("fases.entregables"), proyecto),
  pagina('proyectos/:codigo', Paginas.Proyecto, 'project', "proyecto", t("landing.proyecto"), proyecto),
  pagina('proyectos', Paginas.Proyectos, 'projects', 'proyectos', t("proyectos.mis_proyectos"), privada),
  { path: 'chats', redirectTo: 'proyectos', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
