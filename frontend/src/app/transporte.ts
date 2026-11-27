import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, fromEvent, takeUntil } from 'rxjs';
import { traducirError } from './idioma';
import { Auth, Usuario } from './auth';

@Injectable({ providedIn: 'root' })
export class Transporte {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  async request(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<Response> {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) {
      throw new Error('La petición debe pertenecer a la API de StudyFlow.');
    }
    signal?.throwIfAborted();
    let headers = new HttpHeaders();
    new Headers(options.headers).forEach((value, key) => { headers = headers.set(key, value); });
    const request = this.http.request(options.method ?? 'GET', url.pathname + url.search, {
      body: options.body, headers, responseType: 'blob', observe: 'response'
    });

    let respuesta: HttpResponse<Blob> | HttpErrorResponse;
    try {
      respuesta = await firstValueFrom(signal ? request.pipe(takeUntil(fromEvent(signal, 'abort'))) : request);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status === 0) throw error;
      respuesta = error;
    }
    const { status } = respuesta;
    const outputHeaders = new Headers();
    respuesta.headers.keys().forEach(name => outputHeaders.set(name, respuesta.headers.get(name) ?? ''));
    let body = respuesta instanceof HttpResponse ? respuesta.body : respuesta.error as Blob | null;
    if (respuesta instanceof HttpErrorResponse && body instanceof Blob && body.type.includes('json')) {
      try {
        const problem = JSON.parse(await body.text());
        for (const field of ['mensaje', 'detail', 'message']) {
          if (typeof problem?.[field] === 'string') problem[field] = traducirError(problem[field]);
        }
        body = new Blob([JSON.stringify(problem)], { type: body.type });
      } catch { /* Keep the original response when the body is not JSON. */ }
    }
    const result = new Response([204, 205, 304].includes(status) ? null : body, {
      status,
      headers: outputHeaders
    });
    if (result.ok && ['/api/sesion/acceder', '/api/sesion/entrar'].includes(url.pathname)) {
      const data = await result.clone().json() as { token: string; usuario: Usuario };
      signal?.throwIfAborted();
      this.auth.accept(data.token, data.usuario);
    }
    return result;
  }
}
