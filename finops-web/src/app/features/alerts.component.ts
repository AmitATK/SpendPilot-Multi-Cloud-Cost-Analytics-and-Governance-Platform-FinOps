import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="title">Real-Time Alerts</h2>
    <p class="muted">
      Configure channels in DB (<code>alert_channels</code> table). Budget alerts fire at 70/90/100%.
      Run <code>npm run budget:evaluate</code> in the backend to evaluate thresholds.
    </p>
  `,
  styles: [`
    .title{ font-weight:600; }
    .muted{ color:#666; margin-top:8px; }
  `]
})
export class AlertsComponent {}
