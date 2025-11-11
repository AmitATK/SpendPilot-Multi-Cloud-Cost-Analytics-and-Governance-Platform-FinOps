import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, StatementResp, StatementMonth } from '../api.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatTableModule, MatSlideToggleModule],
  styles: [`
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
    .span-12{grid-column:span 12}
    .w-160{min-width:160px}
    table{width:100%}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
  `],
  template: `
    <h2 class="page-title">Showback / Chargeback Statements</h2>

    <div class="grid">
      <mat-card class="span-12">
        <form (submit)="reload($event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <mat-form-field appearance="outline" class="w-160"><mat-label>From (YYYY-MM)</mat-label>
            <input matInput type="month" [(ngModel)]="from" name="from">
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-160"><mat-label>To (YYYY-MM)</mat-label>
            <input matInput type="month" [(ngModel)]="to" name="to">
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-160"><mat-label>Tag key</mat-label>
            <mat-select [(ngModel)]="key" name="key">
              <mat-option value="team">team</mat-option>
              <mat-option value="project">project</mat-option>
              <mat-option value="owner">owner</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-160"><mat-label>Mode</mat-label>
            <mat-select [(ngModel)]="mode" name="mode">
              <mat-option value="proportional">proportional</mat-option>
              <mat-option value="none">none</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary">Run</button>
          <button mat-stroked-button type="button" (click)="downloadCsv()">Download CSV</button>
        </form>

        <div *ngIf="data() as d" style="margin-top:8px" class="mono text-sm">
          Range: {{d.from}} → {{d.to}} | key={{d.key}} | mode={{d.mode}}
        </div>
      </mat-card>

      <mat-card class="span-12" *ngIf="data() as d">
        <ng-container *ngFor="let m of d.months; let i = index">
          <h3 style="margin:12px 0 6px">{{ m.month }} — Total: {{ m.total_raw | number:'1.2-2' }}</h3>
          <table mat-table [dataSource]="m.groups" class="mat-elevation-z0">
            <ng-container matColumnDef="group"><th mat-header-cell *matHeaderCellDef>Group</th><td mat-cell *matCellDef="let g">{{ g.group }}</td></ng-container>
            <ng-container matColumnDef="raw"><th mat-header-cell *matHeaderCellDef>Raw</th><td mat-cell *matCellDef="let g">{{ g.raw | number:'1.2-2' }}</td></ng-container>
            <ng-container matColumnDef="allocated"><th mat-header-cell *matHeaderCellDef>Allocated</th><td mat-cell *matCellDef="let g"><b>{{ g.allocated | number:'1.2-2' }}</b></td></ng-container>
            <ng-container matColumnDef="share"><th mat-header-cell *matHeaderCellDef>Share</th><td mat-cell *matCellDef="let g">{{ g.share | percent:'1.0-2' }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
          <hr *ngIf="i < d.months.length - 1" style="margin:16px 0;border:none;border-top:1px solid #eee">
        </ng-container>
      </mat-card>
    </div>
  `
})
export class StatementsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<StatementResp | null>(null);
  cols = ['group','raw','allocated','share'];

  from = this.defaultFrom();
  to = this.defaultTo();
  key: string = 'team';
  mode: 'proportional' | 'none' = 'proportional';

  ngOnInit(){ this.query(); }
  reload(e: Event){ e.preventDefault(); this.query(); }

  private query(){
    this.api.statementsMonthly({ from: this.from, to: this.to, key: this.key, mode: this.mode })
      .subscribe(r => this.data.set(r));
  }

  downloadCsv(){
    this.api.downloadStatementsCsv({ from: this.from, to: this.to, key: this.key, mode: this.mode })
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'statements.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  private defaultTo(){ const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }
  private defaultFrom(){ const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()-2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }
}
