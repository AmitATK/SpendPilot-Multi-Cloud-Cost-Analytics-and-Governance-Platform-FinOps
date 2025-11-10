import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api.service';

type Anomaly = {
  day: string; service: string; cost: number;
  baseline_mean?: number; baseline_sd?: number; z?: number; jump_vs_prev?: number;
};

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 class="page-title">Anomaly Detection</h2>

    <mat-card class="card" style="margin-bottom:16px;">
      <form (submit)="load($event)" style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <mat-form-field appearance="outline"><mat-label>From</mat-label>
          <input matInput type="date" [(ngModel)]="from" name="from">
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>To</mat-label>
          <input matInput type="date" [(ngModel)]="to" name="to">
        </mat-form-field>
        <button mat-stroked-button>Load</button>
        <button mat-flat-button color="primary" type="button" (click)="detectToday()">Detect today</button>
      </form>
    </mat-card>

    <mat-card class="card">
      <table mat-table [dataSource]="rows()" style="width:100%">
        <ng-container matColumnDef="day"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let r">{{r.day}}</td></ng-container>
        <ng-container matColumnDef="service"><th mat-header-cell *matHeaderCellDef>Service</th><td mat-cell *matCellDef="let r">{{r.service}}</td></ng-container>
        <ng-container matColumnDef="cost"><th mat-header-cell *matHeaderCellDef>Cost</th><td mat-cell *matCellDef="let r">{{r.cost | number:'1.2-2'}}</td></ng-container>
        <ng-container matColumnDef="z"><th mat-header-cell *matHeaderCellDef>Z</th><td mat-cell *matCellDef="let r">{{r.z ?? '-'}}</td></ng-container>
        <ng-container matColumnDef="baseline"><th mat-header-cell *matHeaderCellDef>Baseline</th>
          <td mat-cell *matCellDef="let r">{{r.baseline_mean ?? '-'}} ± {{r.baseline_sd ?? '-'}}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayed"></tr>
        <tr mat-row *matRowDef="let row; columns: displayed"></tr>
      </table>
    </mat-card>
  `
})
export class AnomaliesComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<Anomaly[]>([]);
  displayed = ['day','service','cost','z','baseline'];

  from = this.iso(new Date(Date.now() - 7*24*3600_000));
  to   = this.iso(new Date());

  ngOnInit(){ this.fetch(); }
  load(e: Event){ e.preventDefault(); this.fetch(); }

  fetch(){ this.api.listAnomalies({ from: this.from, to: this.to }).subscribe(r => this.rows.set(r?.anomalies ?? r ?? [])); }
  detectToday(){
    const today = this.iso(new Date());
    this.api.detectAnomalies(today).subscribe(() => this.fetch());
  }
  private iso(d: Date){ return d.toISOString().slice(0,10); }
}
