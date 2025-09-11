import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { EmailsService } from '../../../../services/emails.service';
import { Email } from '../../../../models/email.model';

@Component({
  selector: 'app-emails-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './emails-details.html',
  styleUrls: ['./emails-details.scss']
})
export class EmailsDetails {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emailsSvc = inject(EmailsService);

  loading = true;
  error: string | null = null;
  email: Email | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid email id.';
      this.loading = false;
      return;
    }

    this.emailsSvc.getById(id).subscribe({
      next: (e) => {
        this.email = e;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load email.';
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/admin/emails']);
  }

  get initials(): string {
    if (!this.email) return '';
    const a = (this.email.emailCode?.trim()?.[0] ?? 'E');
    const b = (this.email.emailSubject?.trim()?.[0] ?? 'M');
    return (a + b).toUpperCase();
  }

  get hasBody(): boolean {
    return !!(this.email?.emailBody && this.email.emailBody.trim().length);
  }
}
