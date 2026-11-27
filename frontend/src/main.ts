import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot, provideRouter, Router, RouterOutlet,
  RouteReuseStrategy, withInMemoryScrolling
} from '@angular/router';
import { authInterceptor } from './app/auth';
import { rutas } from './app/rutas';
import { SelectorIdioma } from './app/selector-idioma';
import { Transporte } from './app/transporte';

@Component({
  selector: 'studyflow-root',
  imports: [RouterOutlet, SelectorIdioma],
  template: '<router-outlet /><studyflow-idioma />',
  host: { '(click)': 'follow($event)', style: 'display: contents' }
})
class StudyFlow {
  private readonly router = inject(Router);
  private readonly transport = inject(Transporte);

  follow(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const source = event.target instanceof Element ? event.target : null;
    const link = source?.closest<HTMLAnchorElement>('a[href]');
    if (!link) return;
    const target = new URL(link.href, location.origin);
    if (target.origin !== location.origin) return;

    if (/^\/api\/(?:archivos\/\d+|tareas\/\d+\/resultado\/archivo)$/.test(target.pathname)) {
      event.preventDefault();
      void this.download(target.pathname, link);
      return;
    }
    if (link.target || link.hasAttribute('download') || link.getAttribute('href')?.startsWith('#')) return;
    if (target.pathname.startsWith('/api/') || /\.[a-z0-9]+$/i.test(target.pathname)) return;
    event.preventDefault();
    this.router.navigateByUrl(target.pathname + target.search + target.hash);
  }

  private async download(path: string, link: HTMLAnchorElement) {
    try {
      const response = await this.transport.request(path);
      if (!response.ok) throw new Error('Descarga no disponible');
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const name = (encoded ? decodeURIComponent(encoded) : plain) ?? 'archivo';
      const url = URL.createObjectURL(blob);
      const download = document.createElement('a');
      download.href = url;
      download.download = name;
      download.click();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch {
      link.dispatchEvent(new CustomEvent('studyflow:download-error', { bubbles: true }));
    }
  }
}

class ReusePages extends RouteReuseStrategy {
  shouldDetach() { return false; }
  store() {}
  shouldAttach() { return false; }
  retrieve() { return null; }
  shouldReuseRoute(next: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot) {
    return next.routeConfig === current.routeConfig && next.paramMap.get('codigo') === current.paramMap.get('codigo')
      && next.queryParamMap.get('recorrido') === current.queryParamMap.get('recorrido')
      && next.queryParamMap.get('acceso') === current.queryParamMap.get('acceso')
      && next.queryParamMap.get('canal') === current.queryParamMap.get('canal');
  }
}

bootstrapApplication(StudyFlow, {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(rutas, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    { provide: RouteReuseStrategy, useClass: ReusePages }
  ]
}).catch(error => console.error(error));
