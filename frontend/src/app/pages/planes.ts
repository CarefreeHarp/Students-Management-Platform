import { t } from '../idioma';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Plan { id: string; name: string; price: string; period: string; description: string; beneficios: string[] }
const beneficiosPremium = ["planes.incluye_basico", "planes.avisos_entrega", "planes.resumen_acuerdos"];
const planes: Plan[] = [
  { id: 'mensual', name: t("planes.mensual"), price: '$19.900', period: t("planes.cop_mes"), description: t("planes.30_dias_de_acceso_sin_renovacion_automatica"),
    beneficios: beneficiosPremium },
  { id: 'semestral', name: t("planes.semestral"), price: '$79.900', period: t("planes.cop_semestre"), description: t("planes.180_dias_de_acceso_sin_renovacion_automatica"),
    beneficios: beneficiosPremium },
  { id: 'vitalicio', name: t("planes.vitalicio"), price: '$320.000', period: t("planes.cop_pago_unico"), description: t("planes.un_solo_pago_sin_fecha_de_vencimiento"),
    beneficios: beneficiosPremium }
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
  readonly t = t;
  readonly plans: Plan[] = [
    { id: 'basico', name: t("planes.basico"), price: '$0', period: t("planes.cop_gratis"), description: t("planes.empieza_hoy_sin_tarjeta_ni_cuotas"),
    beneficios: ["planes.calendario", "planes.dependencias", "planes.canales_archivos"] },
    ...planes
  ];
  constructor() { prepararVista(); }
}

@Component({
  selector: 'studyflow-confirmar-plan',
  styleUrl: './planes.css',
  templateUrl: "./confirmar-plan.html"
})
export class ConfirmarPlan {
  readonly t = t;
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
    } catch { this.error = t("planes.no_fue_posible_iniciar_el_pago_de_prueba"); this.busy = false; }
  }
}

interface EstadoPago { referencia: string; plan: string; estado: string; vence: string | null }
function etiqueta(estado: string) { return ({APPROVED: t("planes.aprobado"), PENDING: t("planes.pendiente"), DECLINED: t("planes.rechazado"), ERROR: t("planes.error"), VOIDED: t("planes.anulado")} as Record<string,string>)[estado] ?? estado; }

@Component({
  selector: 'studyflow-mi-plan',
  styleUrl: './planes.css',
  templateUrl: "./mi-plan.html"
})
export class MiPlan {
  readonly t = t;
  private readonly http = inject(HttpClient); pagos: EstadoPago[] = []; loading = true; error = ''; etiqueta = etiqueta;
  constructor() { prepararVista(); this.http.get<EstadoPago[]>('/api/pagos/wompi/mi-plan').subscribe({next: x => { this.pagos = x; this.loading = false; }, error: () => { this.error = t("planes.no_fue_posible_consultar_tus_pagos"); this.loading = false; }}); }
}

@Component({
  selector: 'studyflow-resultado-pago', styleUrl: './planes.css',
  templateUrl: "./resultado-pago.html"
})
export class ResultadoPago {
  readonly t = t;
  private readonly route = inject(ActivatedRoute); private readonly http = inject(HttpClient); mensaje = t("planes.consultando_el_pago");
  constructor() {
    prepararVista(); const ref = this.route.snapshot.queryParamMap.get('referencia'), id = this.route.snapshot.queryParamMap.get('id');
    if (!ref) { this.mensaje = t("planes.no_se_encontro_la_referencia_del_pago"); return; }
    const params: Record<string,string> = {referencia: ref}; if (id) params['id'] = id;
    this.http.get<EstadoPago>('/api/pagos/wompi/estado', {params}).subscribe({next: p => this.mensaje = (t("planes.estado") + " ") + etiqueta(p.estado), error: () => this.mensaje = t("planes.no_fue_posible_confirmar_el_pago_revisa_mi")});
  }
}
