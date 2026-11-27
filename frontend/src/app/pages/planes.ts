import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Plan { id: string; name: string; price: string; period: string; description: string }
const planes: Plan[] = [
  { id: 'mensual', name: 'Mensual', price: '$19.900', period: 'COP / mes', description: '30 días de acceso, sin renovación automática.' },
  { id: 'semestral', name: 'Semestral', price: '$79.900', period: 'COP / semestre', description: '180 días de acceso, sin renovación automática.' },
  { id: 'vitalicio', name: 'Vitalicio', price: '$320.000', period: 'COP · pago único', description: 'Un solo pago, sin fecha de vencimiento.' }
];

function prepararVista() {
  document.body.className = 'plans-view';
  delete document.body.dataset['page'];
  document.querySelectorAll<HTMLLinkElement>('link[data-view]').forEach(link => link.media = 'not all');
}

@Component({
  selector: 'studyflow-planes',
  imports: [RouterLink],
  styleUrls: ['./planes.css', './catalogo-planes.css'],
  templateUrl: './catalogo-planes.html'
})
export class Planes {
  readonly plans: Plan[] = [
    { id: 'basico', name: 'Básico', price: '$0', period: 'COP · gratis', description: 'Empieza hoy, sin tarjeta ni cuotas.' },
    ...planes
  ];
  readonly features = [
    'Horario y pendientes de clase',
    'Proyectos y tareas en equipo',
    'Chat por canales con resúmenes de Gemini'
  ];
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
