import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  correo: string;
  universidad: string;
  programa: string;
  semestre: number;
  edad: number;
  descripcion: string;
  avatarUrl: string;
  fechaRegistro: string;
}

const authHeaders = { 'X-StudyFlow-Auth': '1' };
const authRoutes = new Set([
  '/api/sesion/acceder', '/api/sesion/entrar',
  '/api/sesion/renovar', '/api/sesion/salir', '/api/usuarios/registro', '/api/usuarios/acceso'
]);

@Injectable({ providedIn: 'root' })
export class Auth {
  // El JWT vive en memoria. Solo la cookie HttpOnly sobrevive una recarga.
  private readonly transport = new HttpClient(inject(HttpBackend));
  private readonly router = inject(Router);
  private pending?: Observable<string | null>;
  private generation = 0;
  token: string | null = null;
  user: Usuario | null = null;

  accept(token: string, user?: Usuario) {
    this.token = token;
    if (user) {
      this.generation++;
      this.pending = undefined;
      this.user = user;
    }
  }

  refresh(): Observable<string | null> {
    if (this.pending) return this.pending;
    const generation = this.generation;
    this.pending = this.transport.post<{ token: string }>('/api/sesion/renovar', null, { headers: authHeaders }).pipe(
      map(({ token }) => {
        if (this.generation === generation) this.accept(token);
        return this.token;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) return throwError(() => error);
        if (this.generation === generation) this.clear();
        return of(this.token);
      }),
      finalize(() => {
        if (this.generation === generation) this.pending = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.pending;
  }

  logout(): Observable<unknown> {
    return this.transport.post('/api/sesion/salir', null, {
      headers: { ...authHeaders, ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) }
    }).pipe(tap(() => this.clear()));
  }

  loginUrl(url: string) {
    return this.router.createUrlTree(['/login'], { queryParams: { acceso: 'cuenta', volver: url } });
  }

  private clear() {
    this.generation++;
    this.pending = undefined;
    this.token = null;
    this.user = null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const url = new URL(req.url, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return next(req);
  if (url.pathname.startsWith('/api/admin/')) return next(req);

  if (authRoutes.has(url.pathname)) return next(req.clone({ setHeaders: authHeaders }));

  const auth = inject(Auth);
  const sentToken = auth.token;
  const withBearer = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req;
  return next(withBearer(sentToken)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      const refreshed = auth.token && auth.token !== sentToken ? of(auth.token) : auth.refresh();
      return refreshed.pipe(switchMap(token => token ? next(withBearer(token)) : throwError(() => error)));
    })
  );
};

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const http = inject(HttpClient);
  const session = auth.token ? of(auth.token) : auth.refresh();
  return session.pipe(
    switchMap(token => token
      ? http.get<Usuario>('/api/usuarios/actual').pipe(map(user => { auth.user = user; return true; }))
      : of(auth.loginUrl(state.url))),
    catchError(() => of(auth.loginUrl(state.url)))
  );
};

export const projectGuard: CanActivateFn = route => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const codigo = route.paramMap.get('codigo') ?? '';
  return http.get('/api/proyectos/' + encodeURIComponent(codigo)).pipe(
    map(() => true),
    catchError((error: HttpErrorResponse) => of(error.status === 401
      ? router.createUrlTree(['/login'], { queryParams: { acceso: 'cuenta' } })
      : router.createUrlTree(['/proyectos'])))
  );
};
