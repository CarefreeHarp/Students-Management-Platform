import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Plan { id: string; name: string; price: string; period: string; description: string }
const planes: Plan[] = [
  { id: 'mensual', name: 'Mensual', price: '$19.900', period: 'COP / mes', description: 'Simulación por 30 días. Pago único; sin renovación automática.' },
  { id: 'semestral', name: 'Semestral', price: '$79.900', period: 'COP / semestre', description: 'Simulación por 180 días. Pago único; sin renovación automática.' },
  { id: 'vitalicio', name: 'Vitalicio', price: '$320.000', period: 'COP · pago único', description: 'Simulación de pago único, sin vencimiento.' }
];

function prepararVista() {
  document.body.className = 'plans-view';
  delete document.body.dataset['page'];
  document.querySelectorAll<HTMLLinkElement>('link[data-view]').forEach(link => link.media = 'not all');
}

@Component({
  selector: 'studyflow-planes',
  styleUrl: './planes.css',
  template: `
    <div class="plans-page">
      <header class="topbar"><a class="brand" href="/"><img src="/assets/img/studyflow-isotipo.png" alt=""> StudyFlow</a><a class="top-link" href="/login?acceso=cuenta">Mi cuenta <span aria-hidden="true">↗</span></a></header>
      <main class="content">
        <a class="back" href="/">← Volver al inicio</a>
        <section class="intro"><span class="eyebrow">ELIGE TU RITMO</span><h1>Hazle espacio a lo que <em>importa.</em></h1><p>Un lugar para tus clases, proyectos y todo lo que viene. Descubre el plan que se adapta a ti.</p></section>
        <div class="notice"><span aria-hidden="true">✦</span><div><strong>Modo de prueba</strong><p>Usa únicamente datos de prueba: no hay cobros reales ni funciones Premium exclusivas.</p></div></div>
        <section class="plans-grid" aria-label="Planes disponibles">
          <article class="plan"><div class="plan-top"><span class="plan-icon">✧</span><span class="badge neutral">GRATIS</span></div><h2>Básico</h2><p class="description">Tu espacio para empezar a organizarte.</p><div class="price">$0 <small>COP</small></div><p class="period">Sin costo</p><a class="action secondary" href="/registro">Crear mi cuenta <span>↗</span></a></article>
          @for (plan of plans; track plan.id) {
            <article class="plan" [class.featured]="plan.id === 'semestral'"><div class="plan-top"><span class="plan-icon">✦</span>@if (plan.id === 'semestral') { <span class="badge">RECOMENDADO</span> }</div><h2>{{ plan.name }}</h2><p class="description">{{ plan.description }}</p><div class="price">{{ plan.price }}</div><p class="period">{{ plan.period }}</p><a class="action" [class.secondary]="plan.id !== 'semestral'" [href]="'/planes/confirmar/' + plan.id">Ver detalles <span>↗</span></a></article>
          }
        </section>
        <section class="note"><div><span class="eyebrow">PRÓXIMAMENTE</span><h2>30 días para descubrir Premium.</h2><p>La prueba gratuita anunciada está en preparación. Sus condiciones se comunicarán antes de activarla.</p></div><span class="note-star" aria-hidden="true">✧</span></section>
        <footer>Precios en pesos colombianos. Simulación: los datos se reinician cuando el servidor se reinicia.</footer>
      </main>
    </div>`
})
export class Planes {
  readonly plans = planes;
  constructor() { prepararVista(); }
}

@Component({
  selector: 'studyflow-confirmar-plan',
  styleUrl: './planes.css',
  template: `
    <div class="plans-page"><header class="topbar"><a class="brand" href="/"><img src="/assets/img/studyflow-isotipo.png" alt=""> StudyFlow</a><a class="top-link" href="/perfil">Mi perfil ↗</a></header>
      <main class="content confirm"><a class="back" href="/planes">← Volver a los planes</a>
        @if (plan; as selected) {
          <section class="confirm-card"><span class="eyebrow">TU ELECCIÓN</span><h1>Un paso más cerca de tu <em>flow.</em></h1><p class="confirm-intro">Revisa los detalles de tu plan.</p>
            <div class="summary"><div><span>Plan Premium</span><strong>{{ selected.name }}</strong></div><div class="summary-price"><strong>{{ selected.price }}</strong><span>{{ selected.period }}</span></div></div>
            <div class="notice compact"><span aria-hidden="true">✦</span><div><strong>Pago de prueba con Wompi</strong><p>Sin dinero real y sin renovación automática. Los datos se borran al reiniciar el servidor.</p></div></div>
            <button class="action pay" type="button" (click)="pagar()" [disabled]="busy">{{ busy ? "Preparando pago…" : "Continuar a Wompi" }} <span>↗</span></button>
            @if (error) { <p class="payment-error" role="alert">{{ error }}</p> }
            <a class="action secondary" href="/planes">Explorar otros planes <span>↗</span></a>
          </section>
        } @else { <section class="confirm-card"><h1>Plan no encontrado.</h1><p>Elige una de las opciones disponibles.</p><a class="action secondary" href="/planes">Ver planes ↗</a></section> }
      </main>
    </div>`
})
export class ConfirmarPlan {
  readonly plan = planes.find(plan => plan.id === inject(ActivatedRoute).snapshot.paramMap.get('plan'));
  private readonly http = inject(HttpClient);
  busy = false; error = '';
  constructor() { prepararVista(); }
  async pagar() {
    if (!this.plan || this.busy) return;
    this.busy = true; this.error = '';
    try {
      const pago = await firstValueFrom(this.http.post<{referencia: string; publicKey: string; monto: number; firma: string}>('/api/pagos/wompi/iniciar', {plan: this.plan.id}));
      const url = new URL('https://checkout.wompi.co/p/');
      const retorno = location.origin + '/planes/resultado?referencia=' + encodeURIComponent(pago.referencia);
      url.search = new URLSearchParams({'public-key': pago.publicKey, currency: 'COP', 'amount-in-cents': String(pago.monto), reference: pago.referencia, 'signature:integrity': pago.firma, 'redirect-url': retorno}).toString();
      location.assign(url.toString());
    } catch { this.error = 'No fue posible iniciar el pago de prueba. Inténtalo de nuevo.'; this.busy = false; }
  }
}

interface EstadoPago { referencia: string; plan: string; estado: string; vence: string | null }
function etiqueta(estado: string) { return ({APPROVED: 'Aprobado', PENDING: 'Pendiente', DECLINED: 'Rechazado', ERROR: 'Error', VOIDED: 'Anulado'} as Record<string,string>)[estado] ?? estado; }

@Component({
  selector: 'studyflow-mi-plan',
  styleUrl: './planes.css',
  template: `
    <div class="plans-page"><header class="topbar"><a class="brand" href="/"><img src="/assets/img/studyflow-isotipo.png" alt=""> StudyFlow</a><a class="top-link" href="/perfil">Mi perfil ↗</a></header>
      <main class="content confirm"><a class="back" href="/panel">← Volver a mi espacio</a>
        <section class="confirm-card"><span class="eyebrow">TU CUENTA</span><h1>Tu plan, en un solo <em>lugar.</em></h1>
          <div class="notice compact"><span aria-hidden="true">✦</span><div><strong>Pagos de prueba</strong><p>Esta información se borra cuando se reinicia el servidor. No hay cobros reales, renovaciones automáticas ni funciones Premium exclusivas.</p></div></div>
          @if (loading) { <p>Cargando pagos…</p> } @else if (error) { <p role="alert">{{ error }}</p> } @else if (!pagos.length) { <p>Aún no tienes pagos de prueba.</p> } @else { @for (pago of pagos; track pago.referencia) { <div class="summary"><div><span>Plan {{ pago.plan }}</span><strong>{{ etiqueta(pago.estado) }}</strong></div><div class="summary-price"><span>{{ pago.vence ? "Vigente hasta " + pago.vence.slice(0,10) : pago.plan === "vitalicio" && pago.estado === "APPROVED" ? "Acceso de prueba sin fecha de vencimiento" : "Pago de prueba" }}</span></div></div> } }
          <a class="action secondary" href="/planes">Conocer los planes <span>↗</span></a>
        </section>
      </main>
    </div>`
})
export class MiPlan {
  private readonly http = inject(HttpClient); pagos: EstadoPago[] = []; loading = true; error = ''; etiqueta = etiqueta;
  constructor() { prepararVista(); this.http.get<EstadoPago[]>('/api/pagos/wompi/mi-plan').subscribe({next: x => { this.pagos = x; this.loading = false; }, error: () => { this.error = 'No fue posible consultar tus pagos.'; this.loading = false; }}); }
}

@Component({
  selector: 'studyflow-resultado-pago', styleUrl: './planes.css',
  template: `<div class="plans-page"><header class="topbar"><a class="brand" href="/"><img src="/assets/img/studyflow-isotipo.png" alt=""> StudyFlow</a><a class="top-link" href="/perfil">Mi perfil ↗</a></header><main class="content confirm"><section class="confirm-card"><span class="eyebrow">PAGO DE PRUEBA</span><h1>Resultado del <em>pago.</em></h1><div class="notice compact" role="status"><div><strong>{{ mensaje }}</strong><p>La confirmación se consulta directamente con Wompi. No se realizó un cobro real.</p></div></div><a class="action secondary" href="/mi-plan">Ver mis pagos ↗</a><a class="action secondary" href="/planes">Volver a los planes ↗</a></section></main></div>`
})
export class ResultadoPago {
  private readonly route = inject(ActivatedRoute); private readonly http = inject(HttpClient); mensaje = 'Consultando el pago…';
  constructor() {
    prepararVista(); const ref = this.route.snapshot.queryParamMap.get('referencia'), id = this.route.snapshot.queryParamMap.get('id');
    if (!ref) { this.mensaje = 'No se encontró la referencia del pago.'; return; }
    const params: Record<string,string> = {referencia: ref}; if (id) params['id'] = id;
    this.http.get<EstadoPago>('/api/pagos/wompi/estado', {params}).subscribe({next: p => this.mensaje = 'Estado: ' + etiqueta(p.estado), error: () => this.mensaje = 'No fue posible confirmar el pago. Revisa Mi plan más tarde.'});
  }
}
