import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
Chart.register(...registerables);

type Point = { day: string; service: string; cost: number };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <h2 class="title">Cost Breakdown Dashboard</h2>

    <div class="row">
      <label>From <input type="date" class="input" [(ngModel)]="from" /></label>
      <label>To <input type="date" class="input" [(ngModel)]="to" /></label>
      <button class="btn" (click)="load()">Load</button>
      <button class="btn" (click)="seedToday()">Seed Today (Mock)</button>
      <label class="toggle"><input type="checkbox" [(ngModel)]="stacked" (change)="refreshStack()" /> Stacked</label>
    </div>

    <div class="card" style="height:360px" *ngIf="chartData() as cd">
      <canvas baseChart [type]="'line'" [data]="cd" [options]="chartOptions"></canvas>
    </div>
  `,
  styles: [`
    .title{font-weight:600}
    .row{display:flex;gap:8px;align-items:center;margin:10px 0;flex-wrap:wrap}
    .input{border:1px solid #ddd;border-radius:6px;padding:6px 8px}
    .btn{padding:6px 12px;border-radius:8px;border:1px solid #ddd;background:#fafafa;cursor:pointer}
    .card{margin-top:12px;padding:12px;border:1px solid #eee;border-radius:8px;background:#fff}
    .toggle{display:flex;align-items:center;gap:6px;margin-left:8px}
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  from = this.iso(new Date(Date.now() - 6 * 24 * 3600_000));
  to   = this.iso(new Date());
  stacked = false;

  chartData = signal<ChartData<'line'> | null>(null);

 chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    // cast to any to declare keys up-front
    x: { ticks: { maxRotation: 0 }, stacked: false } as any,
    y: { beginAtZero: true, stacked: false } as any,
  },
};


  ngOnInit() { this.load(); }

  load() {
    this.api.dailyCost({ from: this.from, to: this.to }).subscribe((res) => {
      const series = res?.series ?? [];
      this.chartData.set(this.toChart(series));
      this.refreshStack(); // apply current stacked choice
    });
  }

  refreshStack() {
     const stacked = !!this.stacked;

  // ensure scales object exists
  this.chartOptions.scales ??= {};

  // index-signature access to avoid TS complaints
  const scales = this.chartOptions.scales as any;
  scales['x'] = { ...(scales['x'] || {}), stacked };
  scales['y'] = { ...(scales['y'] || {}), stacked };
    // trigger change detection by re-setting the object reference if needed:
    this.chartOptions = { ...this.chartOptions };
  }

  seedToday() {
    const today = this.iso(new Date());
    this.api.triggerMock(today).subscribe(() => this.load());
  }

  private toChart(series: any[]): ChartData<'line'> {
    const rows: Point[] = series.map(r => ({ day: r.day, service: r.service, cost: Number(r.cost || 0) }));
    const labels = Array.from(new Set(rows.map(r => r.day))).sort();
    const services = Array.from(new Set(rows.map(r => r.service)));

    // datasets per service
    const datasets = services.map(svc => {
      const byDay = new Map(rows.filter(r => r.service === svc).map(r => [r.day, r.cost]));
      const data = labels.map(d => byDay.get(d) ?? 0);
      return { label: svc, data, fill: false } as const;
    });

    // "Total" dataset (sum of all services)
    const total = labels.map(d =>
      rows.filter(r => r.day === d).reduce((s, r) => s + r.cost, 0)
    );
    datasets.unshift({ label: 'Total', data: total, borderWidth: 2, borderDash: [6, 4], pointRadius: 0 } as any);

    return { labels, datasets } as ChartData<'line'>;
  }

  private iso(d: Date) { return d.toISOString().slice(0,10); }
}
