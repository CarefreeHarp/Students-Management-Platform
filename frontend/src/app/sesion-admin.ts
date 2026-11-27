import { t } from './idioma';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

export interface EstadoAdmin {
  autenticado: boolean;
  soloEsquema: boolean;
  csrf: string;
  instancia: string;
}

@Injectable({ providedIn: 'root' })
export class SesionAdmin {
  private readonly http = inject(HttpClient);

  estado() {
    return this.http.get<EstadoAdmin>('/api/admin/estado', { timeout: 15000 });
  }

  acceder(usuario: string, contrasena: string) {
    return this.estado().pipe(
      catchError(() => throwError(() => new Error(
        t("sesion_admin.el_panel_de_administracion_no_responde_vuelve_a")
      ))),
      switchMap(({ csrf }) => this.http.post<void>('/api/admin/acceder',
        new HttpParams().set('username', usuario).set('password', contrasena),
        { headers: { 'X-CSRF-TOKEN': csrf }, timeout: 15000 }
      ).pipe(catchError((error: HttpErrorResponse) => {
        const mensaje = error.status === 401 ? t("sesion_admin.usuario_o_contrasena_incorrectos")
          : error.status === 429 ? t("sesion_admin.demasiados_intentos_espera_dos_minutos")
            : error.status === 403 ? t("sesion_admin.la_sesion_de_acceso_caduco_intenta_de_nuevo")
              : t("sesion_admin.no_se_pudo_iniciar_sesion_comprueba_que_el");
        return throwError(() => new Error(mensaje));
      })))
    );
  }
}
