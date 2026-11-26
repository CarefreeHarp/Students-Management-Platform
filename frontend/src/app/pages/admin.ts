import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, firstValueFrom, take, timer } from 'rxjs';
import { EstadoAdmin, SesionAdmin } from '../sesion-admin';

interface BaseDatos {
  motor: string;
  version: string;
  esquema: string;
  enMemoria: boolean;
  tablas: string[];
}

interface Tabla {
  nombre: string;
  columnas: { nombre: string; tipo: string }[];
  filas: (string | null)[][];
  totalFilas: number;
  pagina: number;
  filasPorPagina: number;
}

@Component({
  selector: 'studyflow-admin',
  imports: [RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sesion = inject(SesionAdmin);
  private readonly ruta = '/api/admin';
  private estado?: EstadoAdmin;

  protected readonly vista = signal<'cargando' | 'acceso' | 'panel' | 'reiniciando' | 'error'>('cargando');
  protected readonly base = signal<BaseDatos | null>(null);
  protected readonly tabla = signal<Tabla | null>(null);
  protected readonly tablaElegida = signal('');
  protected readonly totalPaginas = computed(() => {
    const datos = this.tabla();
    return datos ? Math.max(1, Math.ceil(datos.totalFilas / datos.filasPorPagina)) : 1;
  });
  protected readonly ocupado = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly error = signal('');
  protected readonly aviso = signal('');

  ngOnInit() {
    document.body.className = '';
    delete document.body.dataset['page'];
    delete document.body.dataset['projectId'];
    document.querySelectorAll<HTMLLinkElement>('link[data-view]').forEach(link => link.media = 'not all');
    void this.cargar();
  }

  protected async cargar() {
    this.vista.set('cargando');
    this.error.set('');
    try {
      this.estado = await firstValueFrom(this.sesion.estado());
      if (!this.estado.autenticado) {
        this.mostrarAcceso();
        return;
      }
      this.base.set(await firstValueFrom(this.http.get<BaseDatos>(this.ruta + '/base-de-datos')));
      this.vista.set('panel');
    } catch {
      this.vista.set('error');
      this.error.set('El panel local no está disponible. Comprueba que el backend se haya iniciado con make backend.');
    }
  }

  protected async entrar(evento: SubmitEvent, usuario: HTMLInputElement, contrasena: HTMLInputElement) {
    evento.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    try {
      const acceso = this.sesion.acceder(usuario.value.trim(), contrasena.value);
      contrasena.value = '';
      await firstValueFrom(acceso);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async abrirTabla(nombre: string, pagina = 1) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.tablaElegida.set(nombre);
    this.tabla.set(null);
    try {
      const datos = await firstValueFrom(this.http.get<Tabla>(this.ruta + '/tablas/' + encodeURIComponent(nombre), {
        params: { pagina }
      }));
      this.tabla.set(datos);
    } catch (error) {
      await this.errorPanel(error, 'No se pudo cargar la tabla.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async salir() {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    try {
      await this.enviar('/salir');
      this.mostrarAcceso();
      await this.cargar();
    } catch (error) {
      await this.errorPanel(error, 'No se pudo cerrar la sesión.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async reiniciar() {
    if (this.ocupado() || !this.estado) return;
    this.ocupado.set(true);
    this.confirmando.set(false);
    this.error.set('');
    const anterior = this.estado.instancia;
    try {
      await this.enviar('/reiniciar');
    } catch (error) {
      // Durante el apagado, el proxy puede cerrar la conexión antes del 202.
      if (!(error instanceof HttpErrorResponse) || ![0, 502, 503, 504].includes(error.status)) {
        await this.errorPanel(error, 'No se pudo solicitar el reinicio.');
        this.ocupado.set(false);
        return;
      }
    }

    this.vista.set('reiniciando');
    try {
      this.estado = await firstValueFrom(timer(0, 1000).pipe(
        take(45),
        exhaustMap(() => this.sesion.estado().pipe(catchError(() => EMPTY))),
        filter(estado => estado.instancia !== anterior),
        takeUntilDestroyed(this.destroyRef)
      ));
      this.mostrarAcceso();
      this.aviso.set('El backend volvió a arrancar. Inicia sesión para continuar.');
    } catch {
      if (!this.destroyRef.destroyed) {
        this.vista.set('error');
        this.error.set('No se pudo confirmar el reinicio. Comprueba la terminal y vuelve a conectar.');
      }
    } finally {
      this.ocupado.set(false);
    }
  }

  private enviar(accion: string) {
    return firstValueFrom(this.http.post<void>(this.ruta + accion, null, {
      headers: { 'X-CSRF-TOKEN': this.estado?.csrf ?? '' },
      timeout: 5000
    }));
  }

  private mostrarAcceso() {
    this.base.set(null);
    this.tabla.set(null);
    this.tablaElegida.set('');
    this.confirmando.set(false);
    this.vista.set('acceso');
  }

  private async errorPanel(error: unknown, mensaje: string) {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      await this.cargar();
      if (this.vista() === 'acceso') {
        this.aviso.set('La sesión de administrador caducó. Inicia sesión de nuevo.');
        return;
      }
    }
    this.error.set(mensaje);
  }
}
