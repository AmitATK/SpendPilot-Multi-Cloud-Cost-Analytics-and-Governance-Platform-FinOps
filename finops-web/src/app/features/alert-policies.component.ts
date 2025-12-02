import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { ApiService } from '../api.service';

interface Policy {
  id: string;
  name: string;
  rule?: any;
  rule_json?: any;
  channel_ids?: string[];
  channels?: string[]; 
  active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-alert-policies',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  styles: [`
    .toolbar { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
    .empty { padding:24px; color:#666; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; }
    .chip { background:#eef2ff; color:#1a237e; border-radius:12px; padding:2px 8px; font-size:12px; }
    table { width: 100%; }
    .w120 { width:120px }
    .muted { color: #6b7280; font-size: 12px; }
  `],
  template: `
    <h2 class="page-title">Alert Policies</h2>

    <mat-card>
      <div class="toolbar">
        <button mat-flat-button color="primary" (click)="addPolicy()">
          Add Policy
        </button>
        <button mat-stroked-button (click)="reload()">Refresh</button>
        <button mat-stroked-button (click)="sendTest()">Send Test</button>
        <span class="muted" *ngIf="loading">Loading…</span>
      </div>

      <!-- Empty state -->
      <div class="empty" *ngIf="!loading && dataSource.data.length === 0">
        No policies yet. Click <b>Add Policy</b> to create one.
      </div>

      <div *ngIf="dataSource.data.length > 0">
        <table mat-table [dataSource]="dataSource" class="mat-elevation-z1">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let row">{{ row.name }}</td>
          </ng-container>

          <ng-container matColumnDef="rule">
            <th mat-header-cell *matHeaderCellDef>Rule</th>
            <td mat-cell *matCellDef="let row">
              <ng-container *ngIf="prettyRule(row) as pr">
                <div>{{ pr.title }}</div>
                <div class="muted" *ngIf="pr.meta">{{ pr.meta }}</div>
              </ng-container>
            </td>
          </ng-container>

          <ng-container matColumnDef="channels">
            <th mat-header-cell *matHeaderCellDef>Channels</th>
            <td mat-cell *matCellDef="let row">
              <div class="chips" *ngIf="channelsCount(row) > 0; else noCh">
                <span class="chip" *ngFor="let ch of channelList(row)">{{ ch }}</span>
              </div>
              <ng-template #noCh><span class="muted">—</span></ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef class="w120">Active</th>
            <td mat-cell *matCellDef="let row">
              <mat-slide-toggle [checked]="row.active" (change)="toggleActive(row)">
              </mat-slide-toggle>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="w120">Actions</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="warn" (click)="remove(row)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </mat-card>
  `
})
export class AlertPoliciesComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  loading = false;
  displayedColumns = ['name', 'rule', 'channels', 'active', 'actions'];
  dataSource = new MatTableDataSource<Policy>([]);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.api.listAlertPolicies().subscribe({
      next: (rows: any) => {
        console.log('[policies] payload:', rows);
        const data = Array.isArray(rows) ? rows : [];
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.snack.open('Failed to load policies', 'Close', { duration: 2500 });
      }
    });
  }

  addPolicy() {
    const name = prompt('Policy name');
    if (!name) return;

    const defaultRule = JSON.stringify({ type: 'budget_threshold', threshold: 80 }, null, 2);
    const ruleStr = prompt('Rule JSON (e.g. {"type":"budget_threshold","threshold":80})', defaultRule);
    if (!ruleStr) return;

    let rule: any;
    try { rule = JSON.parse(ruleStr); }
    catch { this.snack.open('Invalid rule JSON', 'Close', { duration: 2500 }); return; }

    this.api.createAlertPolicy({ name, rule, channelIds: [], active: true }).subscribe({
      next: () => { this.snack.open('Policy created', 'Close', { duration: 1800 }); this.reload(); },
      error: () => this.snack.open('Create failed', 'Close', { duration: 2500 })
    });
  }

  toggleActive(row: Policy) {
    this.api.updateAlertPolicy(row.id, { active: !row.active }).subscribe({
      next: () => {
        row.active = !row.active;
        this.dataSource._updateChangeSubscription(); // refresh MatTable
      },
      error: () => this.snack.open('Update failed', 'Close', { duration: 2000 })
    });
  }

  remove(row: Policy) {
    if (!confirm(`Delete policy "${row.name}"?`)) return;
    this.api.deleteAlertPolicy(row.id).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(r => r.id !== row.id);
      },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 2000 })
    });
  }

  sendTest() {
    this.api.testAlertPolicies({ message: 'FinOps test from UI' }).subscribe({
      next: (r: any) => this.snack.open(`Sent to ${r?.sent ?? 0} channel(s)`, 'Close', { duration: 2500 }),
      error: () => this.snack.open('Send test failed', 'Close', { duration: 2500 })
    });
  }

  // -------- Helpers to render columns safely --------

  channelList(row: Policy): string[] {
    // tolerate either "channels" (strings) or "channel_ids" (uuids)
    const list = (row.channels ?? row.channel_ids ?? []) as string[];
    return Array.isArray(list) ? list : [];
  }

  channelsCount(row: Policy): number {
    return this.channelList(row).length;
  }

  prettyRule(row: Policy): { title: string; meta?: string } {
    const rule = (row.rule ?? row.rule_json) || {};
    const t = (rule.type || rule.kind || '').toString();

    if (t === 'budget_threshold') {
      const thr = rule.threshold ?? rule.pct ?? rule.percent ?? 80;
      return { title: 'Budget threshold', meta: `>= ${thr}%` };
    }
    if (t === 'anomaly') {
      const z = rule.z ?? rule.zScore ?? 3;
      return { title: 'Anomaly detection', meta: `z ≥ ${z}` };
    }
    // default
    return { title: 'Custom rule', meta: JSON.stringify(rule) };
  }
}
