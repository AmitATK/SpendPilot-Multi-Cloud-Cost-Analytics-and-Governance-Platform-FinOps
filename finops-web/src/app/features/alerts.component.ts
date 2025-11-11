import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, AlertChannel } from '../api.service';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule
  ],
  styles: [`
    .grid { display:grid; grid-template-columns: repeat(12, 1fr); gap:16px; }
    .span-5 { grid-column: span 5; }
    .span-7 { grid-column: span 7; }
    .full { grid-column: span 12; }
    .actions { display:flex; gap:8px; justify-content:flex-end; }
    code { background:#f3f4f6; padding:2px 6px; border-radius:6px; }
  `],
  template: `
    <h2 class="page-title">Alert Channels</h2>

    <div class="grid">
      <!-- Create / Edit -->
      <mat-card class="span-5 card">
        <h3 style="margin:0 0 8px">{{ editId() ? 'Edit Channel' : 'Add Channel' }}</h3>
        <form (submit)="save($event)" style="display:flex; flex-direction:column; gap:12px">
          <mat-form-field appearance="outline">
            <mat-label>Channel</mat-label>
            <mat-select [(ngModel)]="form.channel" name="channel" required>
              <mat-option value="email">Email</mat-option>
              <mat-option value="slack">Slack Webhook</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Target</mat-label>
            <input matInput [(ngModel)]="form.target" name="target" placeholder="user@company.com or https://hooks.slack.com/..." required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Scope JSON (optional)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="form.scopeText" name="scope"></textarea>
          </mat-form-field>

          <mat-slide-toggle [(ngModel)]="form.active" name="active">Active</mat-slide-toggle>

          <div class="actions">
            <button mat-stroked-button type="button" (click)="reset()">Clear</button>
            <button mat-flat-button color="primary">{{ editId() ? 'Update' : 'Create' }}</button>
          </div>
        </form>
      </mat-card>

      <!-- List -->
      <mat-card class="span-7 card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="margin:0">Configured Channels</h3>
          <button mat-stroked-button color="primary" (click)="sendTest()">
            <mat-icon style="margin-right:6px">notifications_active</mat-icon>Send Test
          </button>
        </div>

        <table mat-table [dataSource]="rows()" class="mat-elevation-z0" style="width:100%">
          <ng-container matColumnDef="channel">
            <th mat-header-cell *matHeaderCellDef>Channel</th>
            <td mat-cell *matCellDef="let r">{{ r.channel }}</td>
          </ng-container>

          <ng-container matColumnDef="target">
            <th mat-header-cell *matHeaderCellDef>Target</th>
            <td mat-cell *matCellDef="let r"><code>{{ r.target }}</code></td>
          </ng-container>

          <ng-container matColumnDef="active">
            <th mat-header-cell *matHeaderCellDef>Active</th>
            <td mat-cell *matCellDef="let r">
              <mat-slide-toggle [checked]="r.active" (change)="toggleActive(r, $event.checked)"></mat-slide-toggle>
            </td>
          </ng-container>

          <ng-container matColumnDef="scope">
            <th mat-header-cell *matHeaderCellDef>Scope</th>
            <td mat-cell *matCellDef="let r"><code>{{ r.scope | json }}</code></td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r" class="actions">
              <button mat-icon-button (click)="edit(r)" aria-label="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="remove(r)" aria-label="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </mat-card>
    </div>
  `
})
export class AlertsComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<AlertChannel[]>([]);
  cols = ['channel','target','active','scope','actions'];

  // form model
  editId = signal<string | null>(null);
  form = { channel: 'email' as 'email'|'slack', target: '', scopeText: '', active: true };

  ngOnInit(){ this.load(); }

  load(){ this.api.listAlertChannels().subscribe(v => this.rows.set(v)); }

  reset(){
    this.editId.set(null);
    this.form = { channel: 'email', target: '', scopeText: '', active: true };
  }

  edit(r: AlertChannel){
    this.editId.set(r.id);
    this.form.channel = r.channel;
    this.form.target = r.target;
    this.form.active = !!r.active;
    this.form.scopeText = r.scope ? JSON.stringify(r.scope) : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  save(ev: Event){
    ev.preventDefault();
    let scope: any = {};
    if (this.form.scopeText?.trim()) {
      try { scope = JSON.parse(this.form.scopeText); }
      catch { alert('Scope must be valid JSON'); return; }
    }
    const dto = { channel: this.form.channel, target: this.form.target, scope, active: this.form.active };

    if (this.editId()) {
      this.api.updateAlertChannel(this.editId()!, dto).subscribe(updated => {
        this.rows.set(this.rows().map(r => r.id === updated.id ? updated : r));
        this.reset();
      });
    } else {
      this.api.createAlertChannel(dto).subscribe(created => {
        this.rows.set([created, ...this.rows()]);
        this.reset();
      });
    }
  }

  toggleActive(r: AlertChannel, active: boolean){
    this.api.updateAlertChannel(r.id, { active }).subscribe(updated => {
      this.rows.set(this.rows().map(x => x.id === r.id ? updated : x));
    });
  }

  remove(r: AlertChannel){
    if (!confirm('Delete this channel?')) return;
    this.api.deleteAlertChannel(r.id).subscribe(() => {
      this.rows.set(this.rows().filter(x => x.id !== r.id));
      if (this.editId() === r.id) this.reset();
    });
  }

  sendTest(){
    this.api.testAlerts('Hello from FinOps! This is a test alert.').subscribe(res => {
      alert(`Test sent to ${res.sent} channel(s).`);
    });
  }
}
