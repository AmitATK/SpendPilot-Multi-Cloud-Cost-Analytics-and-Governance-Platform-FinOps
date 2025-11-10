import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-ingest',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 class="page-title">Ingest – AWS CUR (MVP)</h2>
    <mat-card class="card">
      <form (submit)="start($event)" style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <mat-form-field appearance="outline"><mat-label>S3 Bucket</mat-label>
          <input matInput name="bucket" placeholder="my-cur-bucket">
        </mat-form-field>
        <mat-form-field appearance="outline" style="min-width:320px"><mat-label>Prefix</mat-label>
          <input matInput name="prefix" placeholder="cur/export/path/">
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Region</mat-label>
          <input matInput name="region" placeholder="us-east-1">
        </mat-form-field>
        <button mat-flat-button color="primary">Start Import</button>
      </form>
      <p class="text-sm" style="margin-top:8px">Backend endpoint: <code>/v1/ingest/aws/cur</code></p>
    </mat-card>
  `
})
export class IngestComponent {
  private api = inject(ApiService);
  start(e: Event){
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = { bucket: fd.get('bucket'), prefix: fd.get('prefix'), region: fd.get('region') };
    this.api.ingestAwsCur(payload).subscribe();
  }
}
