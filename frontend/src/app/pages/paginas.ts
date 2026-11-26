import { Component } from '@angular/core';
import { Pagina } from '../pagina';

@Component({ templateUrl: './landing.html', host: { style: 'display: contents' } })
export class Landing extends Pagina {}

@Component({ templateUrl: './login.html', host: { style: 'display: contents' } })
export class Login extends Pagina {}

@Component({ templateUrl: './registro.html', host: { style: 'display: contents' } })
export class Registro extends Pagina {}

@Component({ templateUrl: './index.html', host: { style: 'display: contents' } })
export class Panel extends Pagina {}

@Component({ templateUrl: './proyectos.html', host: { style: 'display: contents' } })
export class Proyectos extends Pagina {}

@Component({ templateUrl: './crear-proyecto.html', host: { style: 'display: contents' } })
export class CrearProyecto extends Pagina {}

@Component({ templateUrl: './proyecto.html', host: { style: 'display: contents' } })
export class Proyecto extends Pagina {}

@Component({ templateUrl: './fases.html', host: { style: 'display: contents' } })
export class Fases extends Pagina {}

@Component({ templateUrl: './canales.html', host: { style: 'display: contents' } })
export class Canales extends Pagina {}

@Component({ templateUrl: './entregables.html', host: { style: 'display: contents' } })
export class Entregables extends Pagina {}

@Component({ templateUrl: './crear-horario.html', host: { style: 'display: contents' } })
export class Horarios extends Pagina {}

@Component({ templateUrl: './recordatorios.html', host: { style: 'display: contents' } })
export class Recordatorios extends Pagina {}

@Component({ templateUrl: './perfil.html', host: { style: 'display: contents' } })
export class Perfil extends Pagina {}

@Component({ templateUrl: './editar-perfil.html', host: { style: 'display: contents' } })
export class EditarPerfil extends Pagina {}

@Component({ templateUrl: './paleta.html', host: { style: 'display: contents' } })
export class Paleta extends Pagina {}

@Component({ templateUrl: './sandbox.html', host: { style: 'display: contents' } })
export class Sandbox extends Pagina {}

@Component({ templateUrl: './invitacion.html', host: { style: 'display: contents' } })
export class Invitacion extends Pagina {}
