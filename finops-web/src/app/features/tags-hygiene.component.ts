import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService, TagCoverage } from '../api.service';

function iso(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10);
}
@Component({
  selector: 'app-tag-hygiene',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatTableModule, MatChipsModule, MatIconModule, MatProgressBarModule
  ],
  styles: [`
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
    .span-6{grid-column:span 6}
    .span-12{grid-column:span 12}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:end}
    .stat{font-size:28px;font-weight:700}
    .muted{color:#666}
    table{width:100%}
  `],
  template: `
    <h2 class="page-title">Tag Hygiene</h2>

    <mat-card class="span-12">
      <form class="row" (submit)="reload($event)">
        <mat-form-field appearance="outline">
          <mat-label>From (YYYY-MM-DD)</mat-label>
          <input matInput [(ngModel)]="from" name="from">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>To (YYYY-MM-DD)</mat-label>
          <input matInput [(ngModel)]="to" name="to">
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:320px">
          <mat-label>Required tags (comma-separated)</mat-label>
          <input matInput [(ngModel)]="requiredCsv" name="requiredCsv" placeholder="owner,env,team,cost_center">
        </mat-form-field>
        <button mat-flat-button color="primary">Run</button>
      </form>
    </mat-card>

    <div class="grid" style="margin-top:12px">
      <mat-card class="span-6">
        <div class="stat">{{ overallPct() }}%</div>
        <div class="muted">Overall coverage with all required tags</div>
        <mat-progress-bar mode="determinate" [value]="overallPct()"></mat-progress-bar>

        <div style="margin-top:14px">
          <div *ngFor="let t of cov()?.perTag">
            <div style="display:flex;justify-content:space-between">
              <div><b>{{ t.tag }}</b></div>
              <div>{{ t.coverage_pct }}% ({{ t.with_tag }}/{{ t.total }})</div>
            </div>
            <mat-progress-bar mode="determinate" [value]="t.coverage_pct"></mat-progress-bar>
          </div>
        </div>
      </mat-card>

      <mat-card class="span-6">
        <h3>Coverage by Service</h3>
        <table mat-table [dataSource]="cov()?.byService || []">
          <ng-container matColumnDef="service">
            <th mat-header-cell *matHeaderCellDef>Service</th>
            <td mat-cell *matCellDef="let r">{{ r.service }}</td>
          </ng-container>
          <ng-container matColumnDef="pct">
            <th mat-header-cell *matHeaderCellDef>Coverage</th>
            <td mat-cell *matCellDef="let r">{{ r.coverage_pct }}%</td>
          </ng-container>
          <ng-container matColumnDef="counts">
            <th mat-header-cell *matHeaderCellDef>Counts</th>
            <td mat-cell *matCellDef="let r">{{ r.with_all }}/{{ r.total }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="['service','pct','counts']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['service','pct','counts'];"></tr>
        </table>
      </mat-card>

      <mat-card class="span-12">
        <h3>Samples Missing Required Tags</h3>
        <table mat-table [dataSource]="cov()?.samplesMissing || []">
          <ng-container matColumnDef="day">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let r">{{ r.day }}</td>
          </ng-container>
          <ng-container matColumnDef="service">
            <th mat-header-cell *matHeaderCellDef>Service</th>
            <td mat-cell *matCellDef="let r">{{ r.service }}</td>
          </ng-container>
          <ng-container matColumnDef="tags">
            <th mat-header-cell *matHeaderCellDef>Tags</th>
            <td mat-cell *matCellDef="let r">
              <mat-chip-set>
                <mat-chip *ngFor="let k of tagKeys(r.tags)">{{ k }}={{ r.tags[k] }}</mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>
          <ng-container matColumnDef="suggest">
            <th mat-header-cell *matHeaderCellDef>Suggestion</th>
            <td mat-cell *matCellDef="let r">
              <span *ngIf="r.inferred_owner; else none">owner → <b>{{ r.inferred_owner }}</b></span>
              <ng-template #none><span class="muted">—</span></ng-template>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </mat-card>
    </div>
  `
})
export class TagHygieneComponent implements OnInit {
  private api = inject(ApiService);
required: string[] = ['owner','env','team','cost_center'];

  from = (() => { const d = new Date(); d.setDate(d.getDate()-30); return iso(d); })();
  to = iso(new Date());
  requiredCsv = 'owner,env,team,cost_center';

  cols = ['day','service','tags','suggest'];
  cov = signal<TagCoverage | null>(null);

  // ✅ Safe, strictly typed value for the template
  overallPct = computed(() => this.cov()?.overall?.coverage_pct ?? 0);

  ngOnInit(){ 
    this.load(); 
    this.api.get('/v1/settings').pipe(
).subscribe((s: any) => {
  const from = this.from; const to = this.to; // whatever you already have
  this.required = s?.settings?.requiredTags ?? this.required;
  const reqCsv = this.required.join(',');
  this.api.get(`/v1/tags/coverage?from=${from}&to=${to}&required=${encodeURIComponent(reqCsv)}`)
    .subscribe(r => { /* existing render code */ });
});
  }
  reload(e: Event){ e.preventDefault(); this.load(); }

  private load(){
    const required = this.requiredCsv.split(',').map(s=>s.trim()).filter(Boolean);
    this.api.tagCoverage({ from: this.from, to: this.to, required })
      .subscribe(res => this.cov.set(res));
  }

  tagKeys(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj).slice(0, 8);
  }
}
