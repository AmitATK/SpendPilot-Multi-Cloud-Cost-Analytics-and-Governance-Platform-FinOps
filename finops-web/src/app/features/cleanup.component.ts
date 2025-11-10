import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-cleanup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="title">Scheduled Cleanup Suggestions</h2>
    <button (click)="run()" class="btn">Run Scan</button>
    <p class="muted">Flags services with zero spend in last 14 days (MVP heuristic).</p>
  `,
  styles: [`
    .title{ font-weight:600; }
    .btn{ margin-top:8px; padding:6px 12px; border-radius:8px; border:1px solid #ddd; background:#fafafa; cursor:pointer; }
    .muted{ color:#666; margin-top:8px; }
  `]
})
export class CleanupComponent {
  private api = inject(ApiService);
  run() { this.api.triggerCleanupScan().subscribe(); }
}
