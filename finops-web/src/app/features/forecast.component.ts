import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, BaseChartDirective],
  styles: [`.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.span-12{grid-column:span 12}`],
  template: `
    <h2 class="page-title">Forecast</h2>
    <div class="grid">
      <mat-card class="span-12">
        <form (submit)="reload($event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <mat-form-field appearance="outline"><mat-label>Alpha (0.01–0.99)</mat-label>
            <input matInput type="number" step="0.01" min="0.01" max="0.99" [(ngModel)]="alpha" name="alpha">
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Horizon (days)</mat-label>
            <input matInput type="number" min="1" max="90" [(ngModel)]="h" name="h">
          </mat-form-field>
          <button mat-flat-button color="primary">Run</button>
        </form>

        <div style="height:360px;margin-top:10px" *ngIf="chartData() as cd">
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

  chartData = signal<ChartData<'line'> | null>(null);
  seasonalText = '';
  chartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    elements: { line: { tension: 0.25 } },
    scales: { y: { beginAtZero: true } }
  };

  ngOnInit(){ this.fetch(); }
  reload(e: Event){ e.preventDefault(); this.fetch(); }

  private fetch(){
    this.api.forecast({ alpha: this.alpha, h: this.h }).subscribe(r => {
      const labels = [
        ...r.history.map((x: any) => x.day),
        ...r.forecast.map((x: any) => x.day),
      ];
      const histMap = new Map(r.history.map((x: any) => [x.day, x.cost]));
      const fcstMap = new Map(r.forecast.map((x: any) => [x.day, x.pred]));

  const hist = labels.map(d => histMap.has(d) ? histMap.get(d) : null) as (number | null)[];
  const fcst = labels.map(d => fcstMap.has(d) ? fcstMap.get(d) : null) as (number | null)[];

      this.chartData.set({
        labels,
        datasets: [
          { label: 'Actual', data: hist, borderWidth: 2 },
          { label: 'Forecast', data: fcst, borderWidth: 2, borderDash: [6,6] },
        ]
      });

      if (Array.isArray(r.seasonal) && r.seasonal.length === 7) {
        this.seasonalText = r.seasonal.map((v: number) => v.toFixed(2)).join(' , ');
      } else {
        this.seasonalText = '';
      }
    });
  }
}
