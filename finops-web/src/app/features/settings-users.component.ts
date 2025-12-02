import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../api.service';


@Component({
    standalone: true,
    selector: 'app-settings-users',
    imports: [CommonModule, FormsModule, MatTableModule, MatSelectModule],
    template: `
<h3>Organization Users</h3>
<table mat-table [dataSource]="rows" class="mat-elevation-z0" style="width:100%">
<ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let r">{{r.email}}</td></ng-container>
<ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let r">{{r.name || '—'}}</td></ng-container>
<ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Role</th><td mat-cell *matCellDef="let r">
<mat-select [(ngModel)]="r.role" (selectionChange)="save(r)">
<mat-option value="ADMIN">ADMIN</mat-option>
<mat-option value="USER">USER</mat-option>
<mat-option value="VIEWER">VIEWER</mat-option>
</mat-select>
</td></ng-container>


<tr mat-header-row *matHeaderRowDef="cols"></tr>
<tr mat-row *matRowDef="let row; columns: cols;"></tr>
</table>
`
})
export class SettingsUsersComponent {
    private api = inject(ApiService);
    rows: any[] = []; cols = ['email', 'name', 'role'];


    ngOnInit() { this.reload(); }
    reload() { this.api.listOrgUsers().subscribe(r => this.rows = r); }
    save(r: any) { this.api.updateUserRole(r.id, r.role).subscribe(); }
}