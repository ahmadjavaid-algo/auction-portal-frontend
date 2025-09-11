import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EmailsService } from '../../../../services/emails.service';
import { Email } from '../../../../models/email.model';
import { AuthService } from '../../../../services/auth';
import { EmailsForm, EmailFormResult } from '../emails-form/emails-form';

@Component({
  selector: 'app-emails-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './emails-list.html',
  styleUrls: ['./emails-list.scss']
})
export class EmailsList {
  private emailsSvc = inject(EmailsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  // order matches template: code • subject • to • from • status • actions
  displayedColumns: string[] = ['code', 'subject', 'to', 'from', 'status', 'actions'];
  emails = new MatTableDataSource<Email>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  // simple counters (computed from list)
  stats = { totalEmails: 0, activeEmails: 0, inactiveEmails: 0, queued: 0 };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadEmails();
    this.emails.filterPredicate = (e, f) => {
      const haystack = [
        e.emailCode ?? '',
        e.emailSubject ?? '',
        e.emailTo ?? '',
        e.emailFrom ?? ''
      ].join(' ').toLowerCase();
      return haystack.includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.emails.paginator = this.paginator;
  }

  private loadEmails(): void {
    this.emailsSvc.getList().subscribe({
      next: (list: Email[]) => {
        this.emails.data = list ?? [];
        this.totalItems = this.emails.data.length;
        if (this.paginator) this.emails.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
      },
      error: (e) => console.error('Failed to load emails', e)
    });
  }

  private computeStats(): void {
    const all = this.emails.data;
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;
    this.stats.totalEmails = all.length;
    this.stats.activeEmails = active;
    this.stats.inactiveEmails = inactive;
    this.stats.queued = 0; // adjust if you later track queue/outbox
  }

  // ---- Display helpers ----
  getCreatedAt(e: Email): Date | null {
    return e.createdDate ? new Date(e.createdDate) : null;
  }

  // ---- Search / Paging ----
  onSearch(): void {
    this.emails.filter = this.searchTerm.trim().toLowerCase();
    this.totalItems = this.emails.filteredData.length;
    if (this.paginator) {
      this.paginator.firstPage();
      this.pageIndex = 0;
    }
  }

  onPageChange(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.applyPagingTotals();
  }

  private applyPagingTotals(): void {
    this.totalItems = this.emails.filter ? this.emails.filteredData.length : this.emails.data.length;
  }

  /** Range helpers for the right-bottom label */
  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ----- Create -----
  openCreateEmail(): void {
    const ref = this.dialog.open<EmailsForm, { mode: 'create' }, EmailFormResult>(EmailsForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;
      this.emailsSvc.addEmail(res.payload).subscribe({
        next: (newId) => {
          this.snack.open(`Email created (ID ${newId}).`, 'OK', { duration: 2500 });
          this.loadEmails();
        },
        error: () => this.snack.open('Failed to create email.', 'Dismiss', { duration: 3000 })
      });
    });
  }

  // ----- Edit -----
  editEmail(row: Email): void {
    this.emailsSvc.getById(row.emailId).subscribe({
      next: (full) => {
        const ref = this.dialog.open<EmailsForm, { mode: 'edit'; initialData: Email }, EmailFormResult>(EmailsForm, {
          width: '820px',
          data: { mode: 'edit', initialData: full }
        });
        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.emailsSvc.updateEmail(res.payload).subscribe({
            next: (ok) => {
              this.snack.open(ok ? 'Email updated.' : 'Update failed.', 'OK', { duration: 2500 });
              if (ok) this.loadEmails();
            },
            error: () => this.snack.open('Failed to update email.', 'Dismiss', { duration: 3000 })
          });
        });
      },
      error: () => this.snack.open('Failed to load email for edit.', 'Dismiss', { duration: 3000 })
    });
  }

  /** Toggle Active/Inactive with backend call */
  toggleActive(e: Email): void {
    const newState = !(e.active ?? false);
    const payload: Partial<Email> = {
      emailId: e.emailId,
      active: newState,
      modifiedById: this.auth.currentUser?.userId ?? null
    };
    this.emailsSvc.activateEmail(payload as Email).subscribe({
      next: (ok) => {
        if (ok) {
          e.active = newState;
          this.snack.open(`Email ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 2000 });
          this.computeStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  // Navigate to details page (optional)
  viewEmail(emailId: number): void {
    this.router.navigate(['/admin/emails', emailId]);
  }
}
