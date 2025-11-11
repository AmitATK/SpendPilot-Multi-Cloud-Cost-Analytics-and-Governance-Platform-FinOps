import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { ApiService, ForecastResp, ForecastByServiceResp } from '../api.service';

Chart.register(...registerables);

type Mode = 'total' | 'per-service';

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatTableModule, MatIconModule,
    BaseChartDirective
  ],
  styles: [`
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
    .span-12{grid-column:span 12}
    .w-160{min-width:160px}
    .totals{margin-top:12px;background:#fff;border-radius:10px;padding:8px 12px}
    .totals-head{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px 0}
    table{width:100%}
  `],
  template: `
    <h2 class="page-title">Forecast</h2>
    <div class="grid">
      <mat-card class="span-12">
        <form (submit)="reload($event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <mat-form-field appearance="outline" class="w-160"><mat-label>Mode</mat-label>
            <mat-select [(ngModel)]="mode" name="mode">
              <mat-option value="total">Total (all services)</mat-option>
              <mat-option value="per-service">Per-service (stacked)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-160" *ngIf="mode==='per-service'">
            <mat-label>Top N services</mat-label>
            <input matInput type="number" min="1" max="20" [(ngModel)]="topN" name="topN">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-160"><mat-label>Alpha (0.01–0.99)</mat-label>
            <input matInput type="number" step="0.01" min="0.01" max="0.99" [(ngModel)]="alpha" name="alpha">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-160"><mat-label>Horizon (days)</mat-label>
            <input matInput type="number" min="1" max="90" [(ngModel)]="h" name="h">
          </mat-form-field>

          <button mat-flat-button color="primary">Run</button>
        </form>

        <div style="height:380px;margin-top:10px" *ngIf="chartData() as cd">
          <canvas baseChart [type]="'line'" [data]="cd" [options]="chartOptions"></canvas>
        </div>

        <div class="text-sm" style="margin-top:12px" *ngIf="mode==='total' && seasonalText">
          Seasonality (Sun→Sat): {{ seasonalText }}
        </div>

        <div class="totals" *ngIf="mode==='per-service' && totals().length">
          <div class="totals-head">
            <h4 style="margin:0">Next {{h}} days — Total forecast</h4>
            <button mat-stroked-button (click)="downloadTotalsCsv()" [disabled]="!totals().length">
              <mat-icon>download</mat-icon>
              Download CSV
            </button>
          </div>
          <table mat-table [dataSource]="totals()" class="mat-elevation-z0">
            <ng-container matColumnDef="day">
              <th mat-header-cell *matHeaderCellDef>Day</th>
              <td mat-cell *matCellDef="let r">{{r.day}}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Predicted Spend</th>
              <td mat-cell *matCellDef="let r">{{r.totalPred | number:'1.2-2'}}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['day','total']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['day','total']"></tr>
          </table>
        </div>
      </mat-card>
    </div>
  `
})
export class ForecastComponent implements OnInit {
  private api = inject(ApiService);

  mode: Mode = 'total';
  alpha = 0.3;
  h = 30;
  topN = 6; // Top N services selector

  chartData = signal<ChartData<'line'> | null>(null);
  seasonalText = '';
  totals = signal<{ day: string; totalPred: number }[]>([]);

  chartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
    elements: { line: { tension: 0.25 }, point: { radius: 0 } },
    scales: { x: {}, y: { beginAtZero: true } }
  };

  ngOnInit(){ this.fetch(); }
  reload(e: Event){ e.preventDefault(); this.fetch(); }

  private clampTopN(n: number){ return Math.max(1, Math.min(20, Math.floor(n || 1))); }

  private fetch(){
    if (this.mode === 'total') {
      (this.chartOptions.scales!['y'] as any).stacked = false;
      this.api.forecast({ alpha: this.alpha, h: this.h }).subscribe((r: ForecastResp) => {
        const labels = Array.from(new Set([...r.history.map(x=>x.day), ...r.forecast.map(x=>x.day)])).sort();

        const hmap = new Map(r.history.map(x => [x.day, x.cost]));
        const pred = new Map(r.forecast.map(x => [x.day, x.pred]));
        const u80  = new Map(r.forecast.map(x => [x.day, x.high80]));
        const l80  = new Map(r.forecast.map(x => [x.day, x.low80]));
        const u95  = new Map(r.forecast.map(x => [x.day, x.high95]));
        const l95  = new Map(r.forecast.map(x => [x.day, x.low95]));

        const actual = labels.map(d => hmap.get(d) ?? null);
        const fcst   = labels.map(d => pred.get(d) ?? null);
        const up80   = labels.map(d => u80.get(d) ?? null);
        const lo80   = labels.map(d => l80.get(d) ?? null);
        const up95   = labels.map(d => u95.get(d) ?? null);
        const lo95   = labels.map(d => l95.get(d) ?? null);

        this.chartData.set({
          labels,
          datasets: [
            { label: '95% upper', data: up95, borderWidth: 0, backgroundColor: 'rgba(33,150,243,0.10)', fill: false as any, pointRadius: 0 },
            { label: '95% lower', data: lo95, borderWidth: 0, backgroundColor: 'rgba(33,150,243,0.10)', fill: '-1' as any, pointRadius: 0 },
            { label: '80% upper', data: up80, borderWidth: 0, backgroundColor: 'rgba(33,150,243,0.18)', fill: false as any, pointRadius: 0 },
            { label: '80% lower', data: lo80, borderWidth: 0, backgroundColor: 'rgba(33,150,243,0.18)', fill: '-1' as any, pointRadius: 0 },
            { label: 'Forecast', data: fcst, borderWidth: 2, borderDash: [6,6], pointRadius: 0 },
            { label: 'Actual', data: actual, borderWidth: 2, pointRadius: 0 },
          ]
        });

        this.seasonalText = Array.isArray(r.seasonal) && r.seasonal.length === 7
          ? r.seasonal.map(v => v.toFixed(2)).join(' , ')
          : '';
        this.totals.set([]);
      });
    } else {
      // per-service stacked areas (fill), plus totals table
      (this.chartOptions.scales!['y'] as any).stacked = true;
      const limit = this.clampTopN(this.topN);
      this.api.forecastByService({ alpha: this.alpha, h: this.h, limit }).subscribe((r: ForecastByServiceResp) => {
        const labels = Array.from(new Set(r.series.flatMap(s => s.history.map(h=>h.day).concat(s.forecast.map(f=>f.day))))).sort();

        const datasets = r.series.map(s => {
          const hm = new Map(s.history.map(x => [x.day, x.cost]));
          const fm = new Map(s.forecast.map(x => [x.day, x.pred]));
          const data = labels.map(d => hm.get(d) ?? fm.get(d) ?? 0);
          return {
            label: s.service,
            data,
            fill: true as any,
            pointRadius: 0,
            borderWidth: 1,
            stack: 'svc'
          };
        });

        this.chartData.set({ labels, datasets });
        this.seasonalText = '';
        this.totals.set(r.totals);
      });
    }
  }

  downloadTotalsCsv(){
    const rows = this.totals();
    if (!rows.length) return;
    const header = 'day,total\n';
    const body = rows.map(r => `${r.day},${r.totalPred.toFixed(2)}`).join('\n');
    const csv = header + body;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_totals_${this.h}d_top${this.clampTopN(this.topN)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
