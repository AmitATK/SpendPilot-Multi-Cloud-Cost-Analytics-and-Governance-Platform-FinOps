import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { ApiService, ForecastResponse } from '../api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule,
    BaseChartDirective
  ],
  styles: [`
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
    .span-12{grid-column:span 12}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:end}
  `],
  template: `
    <h2 class="page-title">Forecast</h2>
    <div class="grid">
      <mat-card class="span-12">
        <form (submit)="reload($event)" class="row">
          <mat-form-field appearance="outline">
            <mat-label>Alpha (0.01–0.99)</mat-label>
            <input matInput type="number" step="0.01" min="0.01" max="0.99" [(ngModel)]="alpha" name="alpha">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Horizon (days)</mat-label>
            <input matInput type="number" min="1" max="90" [(ngModel)]="h" name="h">
          </mat-form-field>

          <mat-form-field appearance="outline" style="min-width:220px">
            <mat-label>Service (optional)</mat-label>
            <mat-select [(ngModel)]="service" name="service">
              <mat-option [value]="''">(All services)</mat-option>
              <mat-option *ngFor="let s of services" [value]="s">{{ s }}</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-flat-button color="primary">Run</button>
        </form>

        <div style="height:380px;margin-top:10px" *ngIf="chartData() as cd">
          <canvas baseChart [type]="'line'" [data]="cd" [options]="chartOptions"></canvas>
        </div>

        <div class="text-sm" style="margin-top:12px" *ngIf="seasonalText">
          Seasonality (Sun→Sat): {{ seasonalText }}
        </div>
      </mat-card>
    </div>
  `
})
export class ForecastComponent implements OnInit {
  private api = inject(ApiService);

  alpha = 0.3;
  h = 30;
  service = ''; // '' == aggregate

  services: string[] = [];

  chartData = signal<ChartData<'line'> | null>(null);
  seasonalText = '';

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    elements: { line: { tension: 0.25 }, point: { radius: 0 } },
    scales: { y: { beginAtZero: true } }
  };

  ngOnInit() {
    this.api.listServices().subscribe(list => this.services = list || []);
    this.fetch();
  }

  reload(e: Event) { e.preventDefault(); this.fetch(); }

  private fetch() {
    this.api.forecast({ alpha: this.alpha, h: this.h, service: this.service || undefined })
      .subscribe((r: ForecastResponse) => {
        // labels
        const labels: string[] = [
          ...r.history.map(x => x.day),
          ...r.forecast.map(x => x.day),
        ];

        // maps
        const histMap = new Map(r.history.map(x => [x.day, x.cost]));
        const predMap = new Map(r.forecast.map(x => [x.day, x.pred]));
        const up95Map = new Map(r.forecast.map(x => [x.day, x.up95]));
        const lo95Map = new Map(r.forecast.map(x => [x.day, x.lo95]));
        const up80Map = new Map(r.forecast.map(x => [x.day, x.up80]));
        const lo80Map = new Map(r.forecast.map(x => [x.day, x.lo80]));

        // series (ensure correct typing)
        const actual: (number | null)[] = labels.map(d => histMap.has(d) ? (histMap.get(d) as number) : null);
        const fcst: (number | null)[]   = labels.map(d => predMap.has(d) ? (predMap.get(d) as number) : null);
        const up95: (number | null)[]   = labels.map(d => up95Map.has(d) ? (up95Map.get(d) as number) : null);
        const lo95: (number | null)[]   = labels.map(d => lo95Map.has(d) ? (lo95Map.get(d) as number) : null);
        const up80: (number | null)[]   = labels.map(d => up80Map.has(d) ? (up80Map.get(d) as number) : null);
        const lo80: (number | null)[]   = labels.map(d => lo80Map.has(d) ? (lo80Map.get(d) as number) : null);

        this.chartData.set({
          labels,
          datasets: [
            // show bands as thin dashed lines (keeps types simple & avoids fill-index gymnastics)
            { label: '95% upper', data: up95, borderWidth: 1, borderDash: [4,4] },
            { label: '95% lower', data: lo95, borderWidth: 1, borderDash: [4,4] },
            { label: '80% upper', data: up80, borderWidth: 1, borderDash: [2,6] },
            { label: '80% lower', data: lo80, borderWidth: 1, borderDash: [2,6] },
            { label: 'Forecast', data: fcst, borderWidth: 2, borderDash: [6,6] },
            { label: 'Actual', data: actual, borderWidth: 2, pointRadius: 2 },
          ]
        });

        // seasonality text
        if (Array.isArray(r.seasonal) && r.seasonal.length === 7) {
          this.seasonalText = r.seasonal.map(v => v.toFixed(2)).join(' , ');
        } else {
          this.seasonalText = '';
        }
      });
  }
}
