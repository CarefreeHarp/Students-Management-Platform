import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, defer, EMPTY, exhaustMap, filter, firstValueFrom, fromEvent, takeUntil, timer } from 'rxjs';
import { Auth, Usuario } from './auth';
import { SesionAdmin } from './sesion-admin';
import { StudyFlowLanguage, t } from './idioma';
import { Transporte } from './transporte';

interface PageScope { signal: AbortSignal; destroy(): void }
interface ScopeOptions {
  language: typeof StudyFlowLanguage;
  request: (url: string, options?: RequestInit, signal?: AbortSignal) => Promise<Response>;
  loginAdmin: (usuario: string, contrasena: string, signal: AbortSignal) => Promise<void>;
  navigate: (url: string) => unknown;
  logout: () => Promise<unknown>;
  poll: (refresh: () => Promise<void>, ms: number, signal: AbortSignal) => void;
  user: Usuario | null;
}
interface PageData { page: string; script: string; bodyClass?: string; view?: string }
type Behavior = { mount(scope: PageScope): void };

function moduleAt<T>(file: string): Promise<T> {
  return import(/* @vite-ignore */ '/js/' + file + '.js?v=flow-horarios-20261126');
}
const scopeModule: Promise<{ createPageScope(root: HTMLElement, options: ScopeOptions): PageScope }> =
  moduleAt('page-scope');

@Directive()
export abstract class Pagina implements AfterViewInit, OnDestroy {
  readonly t = t;
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly router = inject(Router);
  private readonly transport = inject(Transporte);
  private readonly auth = inject(Auth);
  private readonly sesionAdmin = inject(SesionAdmin);
  private scope?: PageScope;
  private removed = false;

  async ngAfterViewInit() {
    const data = this.route.snapshot.data as PageData;
    const { page, view = 'app', bodyClass } = data;
    const code = this.route.snapshot.paramMap.get('codigo');
    document.body.dataset['page'] = page;
    if (code) document.body.dataset['projectId'] = code;
    else delete document.body.dataset['projectId'];
    document.body.className = bodyClass ?? '';
    document.querySelectorAll<HTMLLinkElement>('link[data-view]').forEach(link => {
      link.media = link.dataset['view'] === view ? 'all' : 'not all';
    });

    const [{ createPageScope }, common, specific, tour] = await Promise.all([
      scopeModule, view === 'app' ? moduleAt<Behavior>('main') : undefined,
      moduleAt<Behavior>(data.script), view === 'app' && this.auth.user ? moduleAt<Behavior>('recorrido') : undefined
    ]);
    if (this.removed) return;
    this.scope = createPageScope(this.host, {
      language: StudyFlowLanguage,
      request: this.transport.request.bind(this.transport),
      loginAdmin: (usuario, contrasena, signal) => firstValueFrom(
        this.sesionAdmin.acceder(usuario, contrasena).pipe(takeUntil(fromEvent(signal, 'abort')))
      ),
      navigate: url => {
        const target = new URL(url, location.origin);
        if (target.origin === location.origin && !target.pathname.startsWith('//')) {
          return this.router.navigateByUrl(target.pathname + target.search + target.hash);
        }
        return this.router.navigateByUrl('/panel');
      },
      logout: () => firstValueFrom(this.auth.logout()),
      poll: (refresh, ms, signal) => {
        timer(ms, ms).pipe(
          filter(() => !document.hidden),
          exhaustMap(() => defer(refresh).pipe(catchError(() => EMPTY))),
          takeUntil(fromEvent(signal, 'abort'))
        ).subscribe();
      },
      user: this.auth.user
    });
    common?.mount(this.scope);
    specific.mount(this.scope);
    if (page === 'dashboard' && this.auth.user) {
      const flow = await moduleAt<Behavior>('flow');
      if (!this.removed && this.scope) flow.mount(this.scope);
    }
    tour?.mount(this.scope);
  }

  ngOnDestroy() {
    this.removed = true;
    this.scope?.destroy();
  }
}
