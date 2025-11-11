import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

Chart.register(...registerables);

@Component({
  selector: 'app-tags-hygiene',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  styles: [`.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.span-6{grid-column:span 6}.span-12{grid-column:span 12}`],
  template: `
    <h2 class="page-title">Tag Hygiene</h2>

    <div class="grid">
      <mat-card class="span-12">
        <form (submit)="reload($event)" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <mat-form-field appearance="outline">
            <mat-label>Lookback (days)</mat-label>
            <input matInput type="number" min="1" max="180" [(ngModel)]="days" name="days">
          </mat-form-field>
          <button mat-flat-button color="primary">Refresh</button>
        </form>
      </mat-card>

      <mat-card class="span-6">
        <h3 style="margin:0 0 8px 0;">Coverage</h3>
        <div style="height:260px" *ngIf="gaugeData() as gd">
          <canvas baseChart [type]="'doughnut'" [data]="gd" [options]="gaugeOptions"></canvas>
        </div>
        <div *ngIf="summary() as s" style="margin-top:8px;color:#555">
          Fully tagged: <b>{{ s.coverage.fully_tagged }}</b> / {{ s.coverage.total }} ({{ s.coverage.pct }}%)
        </div>
      </mat-card>

      <mat-card class="span-6">
        <h3 style="margin:0 0 8px 0;">Missing by Key</h3>
        <table style="width:100%">
          <tr><th style="text-align:left">Key</th><th style="text-align:right">Missing</th></tr>
          <tr *ngFor="let k of (summary()?.required || [])">
            <td>{{ k }}</td>
            <td style="text-align:right">{{ summary()?.missingByKey?.[k] || 0 }}</td>
          </tr>
        </table>
        <div *ngIf="summary()?.invalid as inv" style="margin-top:8px;color:#555">
          Invalid env: <b>{{ inv.env }}</b> &nbsp;|&nbsp; Invalid owner: <b>{{ inv.owner }}</b>
        </div>
      </mat-card>
    </div>
  `
})
export class TagsHygieneComponent implements OnInit {
  private api = inject(ApiService);
  days = 30;

  summary = signal<any | null>(null);
  gaugeData = signal<ChartData<'doughnut'> | null>(null);
  gaugeOptions: ChartOptions<'doughnut'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '70%'
  };

  ngOnInit(){ this.fetch(); }
  reload(e: Event){ e.preventDefault(); this.fetch(); }

  private fetch(){
    this.api.tagScore(this.days).subscribe(s => {
      this.summary.set(s);
      const good = s.coverage?.fully_tagged ?? 0;
      const total = s.coverage?.total ?? 0;
      const bad = Math.max(total - good, 0);
      this.gaugeData.set({
        labels: ['Complete', 'Missing'],
        datasets: [{ data: [good, bad] }]
      });
    });
  }
}
