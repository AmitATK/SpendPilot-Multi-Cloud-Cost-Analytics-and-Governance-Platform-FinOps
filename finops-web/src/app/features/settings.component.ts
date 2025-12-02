import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule],
  styles: [`.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.span-6{grid-column:span 6}.span-12{grid-column:span 12}`],
  template: `
    <h2 class="page-title">Org Settings</h2>
    <div class="grid">
      <mat-card class="span-6">
        <h3>Tag Hygiene</h3>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Required tag keys (comma-separated)</mat-label>
          <input matInput [(ngModel)]="requiredTagsCsv">
        </mat-form-field>
      </mat-card>

      <mat-card class="span-6">
        <h3>Forecast defaults</h3>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline"><mat-label>Alpha (0.01–0.99)</mat-label>
            <input matInput type="number" [(ngModel)]="alpha" min="0.01" max="0.99" step="0.01">
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Horizon (days)</mat-label>
            <input matInput type="number" [(ngModel)]="h" min="1" max="90">
          </mat-form-field>
        </div>
      </mat-card>

      <mat-card class="span-6">
        <h3>Statements</h3>
        <mat-form-field appearance="outline"><mat-label>Top-N services</mat-label>
          <input matInput type="number" [(ngModel)]="topN" min="3" max="20">
        </mat-form-field>
      </mat-card>

      <mat-card class="span-12">
        <button mat-flat-button color="primary" (click)="save()">Save</button>
      </mat-card>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  requiredTagsCsv = 'owner,env,team,cost_center';
  alpha = 0.3;
  h = 30;
  topN = 5;

  ngOnInit() {
    this.api.get('/v1/settings').subscribe((r: any) => {
      const s = r?.settings ?? {};
      this.requiredTagsCsv = (s.requiredTags ?? ['owner','env','team','cost_center']).join(',');
      this.alpha = +(s.forecast?.alpha ?? 0.3);
      this.h = +(s.forecast?.h ?? 30);
      this.topN = +(s.statements?.topN ?? 5);
    });
  }

  save() {
    const requiredTags = this.requiredTagsCsv.split(',').map(s => s.trim()).filter(Boolean);
    this.api.put('/v1/settings', { settings: {
      requiredTags,
      forecast: { alpha: this.alpha, h: this.h },
      statements: { topN: this.topN },
    }}).subscribe(() => {
      this.snack.open('Settings saved', 'OK', { duration: 2000 });
    });
  }
}
