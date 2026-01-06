import {
  Component,
  ViewChild,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmailsService } from '../../../../services/emails.service';
import { Email } from '../../../../models/email.model';
import { AuthService } from '../../../../services/auth';
import { EmailsForm, EmailFormResult } from '../emails-form/emails-form';

type EmailStats = {
  totalEmails: number;
  activeEmails: number;
  inactiveEmails: number;
  queued: number;
};

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
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './emails-list.html',
  styleUrls: ['./emails-list.scss']
})
export class EmailsList implements OnInit, AfterViewInit, OnDestroy {
  private emailsSvc = inject(EmailsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);

  displayedColumns: string[] = ['template', 'subject', 'to', 'from', 'status', 'actions'];
  emails = new MatTableDataSource<Email>([]);
  totalItems = 0;

  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';

  stats: EmailStats = { totalEmails: 0, activeEmails: 0, inactiveEmails: 0, queued: 0 };

  // Animated stats values (same behavior as Users page)
  animatedStats = {
    queued: 0,
    totalEmails: 0,
    activeEmails: 0,
    inactiveEmails: 0
  };

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadEmails();

    this.emails.filterPredicate = (e, f) => {
      const haystack = [
        e.emailCode ?? '',
        e.emailSubject ?? '',
        e.emailTo ?? '',
        e.emailFrom ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.emails.paginator = this.paginator;
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
  }

  private initScrollReveal(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  private loadEmails(): void {
    this.emailsSvc.getList().subscribe({
      next: (list: Email[]) => {
        this.emails.data = list ?? [];
        this.totalItems = this.emails.data.length;
        if (this.paginator) this.emails.paginator = this.paginator;
        this.applyPagingTotals();
        this.computeStats();
        this.animateStats();
      },
      error: (e) => {
        console.error('Failed to load emails', e);
        this.snack.open('Failed to load emails.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private computeStats(): void {
    const all = this.emails.data ?? [];
    const active = all.filter(x => x.active === true).length;
    const inactive = all.length - active;

    // If you later add "queued" in DB, replace this with real value
    const queued = all.filter(x => (x as any)?.status?.toLowerCase?.() === 'queued').length || 0;

    this.stats = {
      totalEmails: all.length,
      activeEmails: active,
      inactiveEmails: inactive,
      queued
    };
  }

  private animateStats(): void {
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out cubic (same as Users page)
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.queued = Math.floor(this.stats.queued * eased);
      this.animatedStats.totalEmails = Math.floor(this.stats.totalEmails * eased);
      this.animatedStats.activeEmails = Math.floor(this.stats.activeEmails * eased);
      this.animatedStats.inactiveEmails = Math.floor(this.stats.inactiveEmails * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  getEmailTitle(e: Email): string {
    return (e.emailCode ?? '').trim() || (e.emailSubject ?? '').trim() || 'Email';
  }

  getEmailInitials(e: Email): string {
    const code = (e.emailCode ?? '').trim();
    if (code) return code.slice(0, 2).toUpperCase();

    const subject = (e.emailSubject ?? '').trim();
    if (!subject) return 'EM';

    const parts = subject.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

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
    this.totalItems = this.emails.filter
      ? this.emails.filteredData.length
      : this.emails.data.length;
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  openCreateEmail(): void {
    const ref = this.dialog.open<EmailsForm, { mode: 'create' }, EmailFormResult>(EmailsForm, {
      width: '820px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe(res => {
      if (!res || res.action !== 'create') return;
      this.emailsSvc.addEmail(res.payload).subscribe({
        next: (newId) => {
          this.snack.open(`Email created successfully (ID ${newId}).`, 'OK', { duration: 2500 });
          this.loadEmails();
        },
        error: () => this.snack.open('Failed to create email.', 'Dismiss', { duration: 3000 })
      });
    });
  }

  editEmail(row: Email): void {
    this.emailsSvc.getById(row.emailId).subscribe({
      next: (full) => {
        const ref = this.dialog.open<EmailsForm, { mode: 'edit'; initialData: Email }, EmailFormResult>(
          EmailsForm,
          {
            width: '820px',
            data: { mode: 'edit', initialData: full }
          }
        );

        ref.afterClosed().subscribe(res => {
          if (!res || res.action !== 'edit') return;
          this.emailsSvc.updateEmail(res.payload).subscribe({
            next: (ok) => {
              this.snack.open(ok ? 'Email updated successfully.' : 'Update failed.', 'OK', { duration: 2500 });
              if (ok) this.loadEmails();
            },
            error: () => this.snack.open('Failed to update email.', 'Dismiss', { duration: 3000 })
          });
        });
      },
      error: () => this.snack.open('Failed to load email for edit.', 'Dismiss', { duration: 3000 })
    });
  }

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
          this.snack.open(`Email ${newState ? 'activated' : 'deactivated'} successfully.`, 'OK', { duration: 2000 });
          this.computeStats();
          this.animateStats();
        } else {
          this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 3000 })
    });
  }

  viewEmail(emailId: number): void {
    this.router.navigate(['/admin/emails', emailId]);
  }
}
