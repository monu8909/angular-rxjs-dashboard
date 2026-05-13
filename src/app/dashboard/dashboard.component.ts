import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserService } from '../services/user.service';
import { ThemeService } from '../theme/theme.service';
import { User, UserRole } from '../models/user.model';
import { ROLE_COLORS } from '../models/user.model';
import { ChartComponent } from '../chart/chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    ChartComponent,
  ],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">User Dashboard</h1>
          <p class="dashboard-subtitle">Manage your team members and their roles</p>
        </div>
        <div class="header-actions">
          <mat-slide-toggle
            [checked]="themeService.currentTheme === 'dark'"
            (toggleChange)="themeService.toggle()"
            [matTooltip]="themeService.currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            {{ themeService.currentTheme === 'dark' ? 'Dark' : 'Light' }}
          </mat-slide-toggle>
          <button mat-raised-button color="primary" (click)="openAddUserModal()">
            <mat-icon>add</mat-icon>
            Add User
          </button>
        </div>
      </header>

      <div class="filters-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search users</mat-label>
          <input
            matInput
            [ngModel]="searchTerm$ | async"
            (ngModelChange)="searchTerm$.next($event)"
            placeholder="Search by name or email..."
          />
          <mat-icon matIconSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="role-filter-field">
          <mat-label>Role</mat-label>
          <mat-select
            [ngModel]="roleFilter$.value"
            (ngModelChange)="roleFilter$.next($event)"
          >
            <mat-option value="">All Roles</mat-option>
            @for (role of roles; track role) {
              <mat-option [value]="role">{{ role }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="dashboard-content">
        <mat-card class="table-card" appearance="outlined">
          @if (loading()) {
            <div class="skeleton-container">
              @for (_ of [1,2,3,4,5]; track _) {
                <div class="skeleton-row">
                  <div class="skeleton-cell skeleton-cell--sm"></div>
                  <div class="skeleton-cell skeleton-cell--lg"></div>
                  <div class="skeleton-cell skeleton-cell--md"></div>
                </div>
              }
            </div>
          } @else if (filteredUsers.length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">people_outline</mat-icon>
              <h3>No users found</h3>
              <p>
                @if (searchTerm$.value || roleFilter$.value) {
                  Try adjusting your search or filter criteria.
                } @else {
                  Get started by adding your first team member.
                }
              </p>
              @if (!searchTerm$.value && !roleFilter$.value) {
                <button mat-raised-button color="primary" (click)="openAddUserModal()">
                  <mat-icon>add</mat-icon>
                  Add User
                </button>
              }
            </div>
          } @else {
            <div class="table-wrapper">
              <table mat-table [dataSource]="dataSource" matSort class="user-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                  <td mat-cell *matCellDef="let user">
                    <div class="cell-with-icon">
                      <mat-icon class="avatar-icon">account_circle</mat-icon>
                      <span>{{ user.name }}</span>
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
                  <td mat-cell *matCellDef="let user">{{ user.email }}</td>
                </ng-container>

                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Role</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="role-badge" [style.background]="getRoleColor(user.role) + '20'" [style.color]="getRoleColor(user.role)">
                      {{ user.role }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>
            <mat-paginator
              [pageSizeOptions]="[5, 10, 25]"
              [pageSize]="10"
              showFirstLastButtons
              aria-label="Select page of users"
            >
            </mat-paginator>
          }
        </mat-card>

        <mat-card class="chart-card" appearance="outlined">
          <mat-card-header>
            <mat-card-title>Role Distribution</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (roleDistribution.length > 0) {
              <app-chart [data]="roleDistribution" />
            } @else {
              <div class="chart-empty">
                <mat-icon>pie_chart</mat-icon>
                <p>No data to display</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        animation: fadeIn 0.3s ease;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
      }

      .header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .dashboard-title {
        font-size: 28px;
        font-weight: 600;
        margin: 0;
      }

      .dashboard-subtitle {
        margin: 0;
        color: var(--text-secondary);
        font-size: 14px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .filters-row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 24px;
        padding: 16px;
        background: var(--card-bg);
        border-radius: 12px;
        box-shadow: var(--shadow);
        align-items: flex-end;
      }

      .search-field {
        flex: 1;
        min-width: 240px;
      }

      .search-field ::ng-deep .mat-mdc-form-field-focus-overlay {
        background-color: rgba(28, 73, 128, 0.04);
      }

      .role-filter-field {
        width: 200px;
      }

      .role-filter-field ::ng-deep .mat-mdc-form-field-focus-overlay {
        background-color: rgba(28, 73, 128, 0.04);
      }

      .dashboard-content {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 24px;
        align-items: start;
      }

      .table-card {
        overflow: hidden;
        border: 1px solid var(--border-color);
      }

      .table-wrapper {
        overflow-x: auto;
        background: var(--card-bg);
      }

      .user-table {
        width: 100%;
        background: var(--card-bg);
      }

      .user-table ::ng-deep th.mat-mdc-header-cell {
        background: linear-gradient(135deg, #1c4980 0%, #16355c 100%);
        color: #fff !important;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        padding: 16px 12px !important;
        border-bottom: 2px solid #0e2138 !important;
      }

      .user-table ::ng-deep td.mat-mdc-cell {
        padding: 14px 12px !important;
        border-bottom: 1px solid var(--border-color) !important;
        font-size: 14px;
      }

      .user-table ::ng-deep tr.mat-mdc-row:hover {
        background-color: rgba(28, 73, 128, 0.04);
        transition: background-color 0.2s ease;
      }

      .user-table ::ng-deep tr.mat-mdc-row {
        height: auto;
      }

      .cell-with-icon {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .avatar-icon {
        color: #1c4980;
        font-size: 24px;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .role-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .role-badge:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
      }

      .mat-mdc-paginator {
        background: linear-gradient(135deg, var(--card-bg) 0%, rgba(28, 73, 128, 0.02) 100%) !important;
        border-top: 1px solid var(--border-color) !important;
        padding: 8px 0 !important;
      }

      .mat-mdc-paginator ::ng-deep .mat-mdc-paginator-container {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0 16px !important;
        gap: 16px;
      }

      .mat-mdc-paginator ::ng-deep .mat-mdc-paginator-page-size {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mat-mdc-paginator ::ng-deep .mat-mdc-paginator-range-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .mat-mdc-paginator ::ng-deep .mat-mdc-paginator-range-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .mat-mdc-paginator ::ng-deep .mat-mdc-icon-button {
        width: 36px !important;
        height: 36px !important;
      }

      .chart-card {
        position: sticky;
        top: 24px;
        border: 1px solid var(--border-color);
      }

      .chart-card ::ng-deep .mat-mdc-card-header {
        background: linear-gradient(135deg, #1c4980 0%, #16355c 100%);
        color: #fff;
        padding: 16px !important;
        margin: -8px -8px 16px -8px;
      }

      .chart-card ::ng-deep .mat-mdc-card-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0 !important;
        color: #fff;
      }

      .chart-card ::ng-deep .mat-mdc-card-content {
        padding: 20px 16px !important;
      }

      .chart-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--text-secondary);
        gap: 8px;
      }

      .chart-empty mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.4;
      }

      .chart-empty p {
        margin: 0;
        font-size: 14px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center;
        background: linear-gradient(135deg, rgba(28, 73, 128, 0.02) 0%, rgba(28, 73, 128, 0.01) 100%);
        min-height: 400px;
      }

      .empty-state h3 {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 16px 0 8px 0;
      }

      .empty-state p {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 20px 0;
        max-width: 400px;
      }

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: rgba(28, 73, 128, 0.2);
        margin-bottom: 16px;
      }

      .skeleton-container {
        padding: 16px;
      }

      .skeleton-row {
        display: flex;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
      }

      .skeleton-cell {
        height: 20px;
        background: linear-gradient(90deg, var(--border-color) 25%, #f5f5f5 50%, var(--border-color) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
      }

      .skeleton-cell--sm { width: 80px; }
      .skeleton-cell--md { width: 120px; }
      .skeleton-cell--lg { flex: 1; }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 960px) {
        .dashboard-content {
          grid-template-columns: 1fr;
        }
        .chart-card {
          position: static;
        }
      }

      @media (max-width: 600px) {
        .dashboard {
          padding: 16px;
        }
        .dashboard-header {
          flex-direction: column;
          align-items: stretch;
        }
        .header-actions {
          justify-content: stretch;
        }
        .filters-row {
          flex-direction: column;
        }
        .role-filter-field {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['name', 'email', 'role'];
  roles: UserRole[] = ['Admin', 'Editor', 'Viewer'];

  dataSource = new MatTableDataSource<User>([]);
  roleDistribution: { role: UserRole; count: number }[] = [];
  filteredUsers: User[] = [];
  loading = signal(true);

  searchTerm$ = new BehaviorSubject<string>('');
  roleFilter$ = new BehaviorSubject<string>('');

  private destroy$ = new Subject<void>();

  constructor(
    public userService: UserService,
    public themeService: ThemeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  getRoleColor(role: string): string {
    return ROLE_COLORS[role as UserRole] || '#999';
  }

  ngOnInit(): void {
    combineLatest([
      this.userService.users$,
      this.searchTerm$.pipe(debounceTime(300), distinctUntilChanged()),
      this.roleFilter$.pipe(distinctUntilChanged()),
    ])
      .pipe(
        map(([users, search, role]) => {
          let filtered = users;
          if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(
              (u) =>
                u.name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
          }
          if (role) {
            filtered = filtered.filter((u) => u.role === role);
          }
          return filtered;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((filtered) => {
        this.filteredUsers = filtered;
        this.dataSource.data = filtered;
        this.loading.set(false);
        this.attachPaginatorAndSort();
      });

    this.userService.roleDistribution$
      .pipe(takeUntil(this.destroy$))
      .subscribe((dist) => {
        this.roleDistribution = dist;
      });
  }

  private attachPaginatorAndSort(): void {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async openAddUserModal(): Promise<void> {
    const { UserFormComponent } = await import('../user-form/user-form.component');

    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'user-form-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.userService.addUser(result);
        this.snackBar.open('User added successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
      }
    });
  }
}
