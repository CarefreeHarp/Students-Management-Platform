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
        'El panel de administración no responde. Vuelve a intentarlo.'
      ))),
      switchMap(({ csrf }) => this.http.post<void>('/api/admin/acceder',
        new HttpParams().set('username', usuario).set('password', contrasena),
        { headers: { 'X-CSRF-TOKEN': csrf }, timeout: 15000 }
      ).pipe(catchError((error: HttpErrorResponse) => {
        const mensaje = error.status === 401 ? 'Usuario o contraseña incorrectos.'
          : error.status === 429 ? 'Demasiados intentos. Espera dos minutos.'
            : error.status === 403 ? 'La sesión de acceso caducó. Intenta de nuevo.'
              : 'No se pudo iniciar sesión. Comprueba que el backend esté disponible.';
        return throwError(() => new Error(mensaje));
      })))
    );
  }
}
