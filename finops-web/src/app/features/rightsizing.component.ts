import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../api.service';


@Component({
    standalone: true,
    selector: 'app-rightsizing',
    imports: [CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule],
    template: `
<h2 class="page-title">Rightsizing Suggestions</h2>
<mat-card style="margin-bottom:12px;">
<form (submit)="run($event)" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
<input placeholder="From (YYYY-MM-DD)" [(ngModel)]="from" name="from">
<input placeholder="To (YYYY-MM-DD)" [(ngModel)]="to" name="to">
<input type="number" placeholder="min p95 cost (USD)" [(ngModel)]="minP95" name="minP95">
<button mat-flat-button color="primary">Run</button>
</form>
</mat-card>


<mat-card>
<table mat-table [dataSource]="rows" class="mat-elevation-z0" style="width:100%">
<ng-container matColumnDef="service"><th mat-header-cell *matHeaderCellDef>Service</th><td mat-cell *matCellDef="let r">{{r.service}}</td></ng-container>
<ng-container matColumnDef="p50"><th mat-header-cell *matHeaderCellDef>P50</th><td mat-cell *matCellDef="let r">{{r.p50 | number:'1.2-2'}}</td></ng-container>
<ng-container matColumnDef="p95"><th mat-header-cell *matHeaderCellDef>P95</th><td mat-cell *matCellDef="let r">{{r.p95 | number:'1.2-2'}}</td></ng-container>
<ng-container matColumnDef="ratio"><th mat-header-cell *matHeaderCellDef>Median/Peak</th><td mat-cell *matCellDef="let r">{{r.utilization_ratio | percent:'1.0-0'}}</td></ng-container>
<ng-container matColumnDef="rec"><th mat-header-cell *matHeaderCellDef>Recommendation</th><td mat-cell *matCellDef="let r"><b>{{r.recommendation}}</b> — {{r.reason}}</td></ng-container>


<tr mat-header-row *matHeaderRowDef="cols"></tr>
<tr mat-row *matRowDef="let row; columns: cols;"></tr>
</table>
</mat-card>
`
})
export class RightsizingComponent {
    private api = inject(ApiService);
    from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    to = new Date().toISOString().slice(0, 10);
    minP95 = 50;


    rows: any[] = []; cols = ['service', 'p50', 'p95', 'ratio', 'rec'];


    ngOnInit() { this.run(new Event('submit')); }
    run(e: Event) { e.preventDefault(); this.api.rightsizing({ from: this.from, to: this.to, minP95: this.minP95 }).subscribe(r => this.rows = r.suggestions); }
}