import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aviso-privacidad',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="visible()">
      <div class="modal-card">
        <div class="modal-header">
          <h2>🔒 Aviso de Privacidad e Información Legal</h2>
          <span class="badge-legal">Cumplimiento LGPDPPSO / LFPDPPP</span>
        </div>

        <div class="modal-body">
          <p>
            En cumplimiento con la <strong>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO)</strong>
            y la Ley Federal de Protección de Datos Personales, <strong>"Leños Rellenos"</strong> (Dolores Hidalgo, Guanajuato) le informa que los datos personales recabados
            (nombre, teléfono, dirección de entrega) serán utilizados <strong>exclusivamente</strong> para:
          </p>

          <ul>
            <li>Procesar, preparar y entregar su pedido de comida a la leña.</li>
            <li>Contactarle vía WhatsApp o teléfono en caso de aclaraciones de entrega o estado del horno.</li>
            <li>Emisión de comprobantes de pago o seguimiento de atención al cliente.</li>
          </ul>

          <div class="highlight-box">
            <p><strong>Minimización de datos:</strong> No almacenamos datos financieros ni compartimos su información con terceros.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" (click)="cerrar()">Cerrar</button>
          <button type="button" class="btn-accept" (click)="aceptar()">Acepto el Aviso de Privacidad</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 10, 5, 0.85);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    .modal-card {
      background: #1f130b;
      border: 1px solid #ff7316;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      color: #fff7ed;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      overflow: hidden;
    }
    .modal-header {
      background: #2a1a0f;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid rgba(255,115,22,0.2);
    }
    .modal-header h2 {
      margin: 0; font-size: 1.3rem; color: #ff7316;
    }
    .badge-legal {
      font-size: 0.75rem; background: rgba(255,115,22,0.2); color: #ff7316;
      padding: 2px 8px; border-radius: 12px; margin-top: 4px; display: inline-block;
    }
    .modal-body {
      padding: 1.5rem; line-height: 1.6; font-size: 0.95rem; color: #e4d5c7;
    }
    .modal-body ul { padding-left: 1.2rem; margin: 1rem 0; }
    .modal-body li { margin-bottom: 0.4rem; }
    .highlight-box {
      background: rgba(255,115,22,0.1); border-left: 4px solid #ff7316;
      padding: 0.8rem 1rem; border-radius: 4px; margin-top: 1rem;
    }
    .modal-footer {
      padding: 1rem 1.5rem; background: #180e08; display: flex;
      justify-content: flex-end; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.05);
    }
    .btn-cancel {
      background: transparent; border: 1px solid #4a382c; color: #a89485;
      padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer;
    }
    .btn-accept {
      background: #ff7316; border: none; color: #fff; font-weight: 600;
      padding: 0.6rem 1.4rem; border-radius: 8px; cursor: pointer;
      transition: background 0.2s;
    }
    .btn-accept:hover { background: #ea580c; }
  `]
})
export class AvisoPrivacidadComponent {
  readonly visible = signal<boolean>(false);

  @Output() aceptado = new EventEmitter<boolean>();

  abrir() {
    this.visible.set(true);
  }

  cerrar() {
    this.visible.set(false);
  }

  aceptar() {
    localStorage.setItem('aviso_privacidad_aceptado', 'true');
    this.visible.set(false);
    this.aceptado.emit(true);
  }
}
