import { Component } from '@angular/core';
import { StudyFlowLanguage, t } from './idioma';

@Component({
  selector: 'studyflow-idioma',
  template: `<button type="button" (click)="cambiar()" [attr.aria-label]="t('idioma.cambiar')" [title]="t('idioma.cambiar')">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>
    </svg><span [lang]="destino()">{{ destino() === 'en' ? 'English' : 'Español' }}</span>
  </button>`,
  styles: [`
    :host { position: fixed; inset: auto auto max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); z-index: 35; }
    button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 8px 14px; border-radius: 24px;
      border: 1px solid #777699; background: #222940; color: #f6f5ff; box-shadow: 0 2px 12px #0003;
      cursor: pointer; font: 600 13px/1.2 'DM Sans', sans-serif; }
    button:hover { background: #343958; } button:focus-visible { outline: 3px solid #b9b5ff; outline-offset: 3px; }
    svg { width: 17px; height: 17px; }
  `]
})
export class SelectorIdioma {
  readonly t = t;
  destino(): 'es' | 'en' { return StudyFlowLanguage.actual() === 'es' ? 'en' : 'es'; }
  cambiar() {
    StudyFlowLanguage.cambiar(this.destino());
    // Keep the temporary workspace in memory while its frame changes language.
    if (document.body.dataset['page'] === 'sandbox') {
      window.dispatchEvent(new Event('studyflow:idioma'));
    } else {
      location.reload();
    }
  }
}
