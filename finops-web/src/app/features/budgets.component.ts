import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Budget } from '../api.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="title">Budget Rules Engine</h2>

    <form class="row" (submit)="create($event)">
      <label>Name <input placeholder="Name" #name class="input"/></label>
      <label>Limit (INR) <input placeholder="Limit (INR)" #limit type="number" class="input"/></label>
      <label>Scope JSON <input placeholder='{"team":"checkout"}' #scope class="input wide"/></label>
      <button class="btn primary">Create</button>
    </form>

    <ul class="list" *ngIf="budgets().length; else empty">
      <li *ngFor="let b of budgets()" class="item">
        <div class="name">{{ b.name }}</div>
        <div>Limit: {{ limitOf(b) }} {{ b.currency }} | Thresholds: {{ b.thresholds.join('% / ') }}%</div>
        <div>Scope: <code>{{ b.scope | json }}</code></div>
      </li>
    </ul>
    <ng-template #empty><p class="muted">No budgets yet. Create one above.</p></ng-template>
  `,
  styles: [`
    .title{ font-weight:600; }
    .row{ display:flex; gap:12px; align-items:center; margin-top:10px; flex-wrap:wrap; }
    .input{ border:1px solid #ddd; border-radius:6px; padding:6px 8px; }
    .wide{ width:320px; }
    .btn{ padding:6px 12px; border-radius:8px; border:1px solid #ddd; background:#fafafa; cursor:pointer; }
    .primary{ background:#111; color:#fff; border-color:#111; }
    .list{ margin-top:12px; display:flex; flex-direction:column; gap:8px; }
    .item{ border:1px solid #eee; border-radius:8px; padding:10px; }
    .name{ font-weight:600; }
    .muted{ color:#666; margin-top:8px; }
  `]
})
export class BudgetsComponent implements OnInit {
  private api = inject(ApiService);
  budgets = signal<Budget[]>([]);

  ngOnInit() { this.refresh(); }

  refresh() {
    this.api.listBudgets().subscribe(v => this.budgets.set(v));
  }

  limitOf(b: Budget) {
    return (b.monthly_limit ?? b.monthlyLimit ?? 0);
  }

  create(ev: Event) {
    ev.preventDefault();
    const form = ev.target as HTMLFormElement;
    const name = (form.querySelector('input[placeholder="Name"]') as HTMLInputElement).value.trim();
    const limit = Number((form.querySelector('input[placeholder="Limit (INR)"]') as HTMLInputElement).value);
    const scopeStr = (form.querySelector('input[placeholder^="{"]') as HTMLInputElement).value || '{}';
    const payload: Partial<Budget> = { name, monthly_limit: limit, scope: JSON.parse(scopeStr) };
    this.api.createBudget(payload).subscribe(b => this.budgets.set([b, ...this.budgets()]));
  }
}
