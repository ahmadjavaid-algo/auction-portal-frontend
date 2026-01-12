import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';

import { EmailsService } from '../../../../services/emails.service';
import { Email } from '../../../../models/email.model';

interface GmailSidebarItem {
  icon: string;
  label: string;
  count?: number;
  active?: boolean;
}

@Component({
  selector: 'app-email-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './email-preview.html',
  styleUrls: ['./email-preview.scss']
})
export class EmailPreview implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emailsSvc = inject(EmailsService);
  private sanitizer = inject(DomSanitizer);

  loading = true;
  error: string | null = null;
  email: Email | null = null;
  
  // Gmail UI State
  currentTime: string = '';
  currentDate: string = '';
  private timeInterval?: ReturnType<typeof setInterval>;
  
  // Sidebar items matching Gmail
  sidebarItems: GmailSidebarItem[] = [
    { icon: 'inbox', label: 'Inbox', count: 26, active: true },
    { icon: 'star', label: 'Starred' },
    { icon: 'schedule', label: 'Snoozed' },
    { icon: 'send', label: 'Sent' },
    { icon: 'drafts', label: 'Drafts', count: 1 },
    { icon: 'label', label: 'Purchases', count: 3 },
    { icon: 'expand_more', label: 'More' }
  ];

  // Simulated email metadata
  emailCount = { current: 4, total: 33 };

  ngOnInit(): void {
    this.updateTime();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
    
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid email ID.';
      this.loading = false;
      return;
    }

    this.emailsSvc.getById(id).subscribe({
      next: (e) => {
        this.email = e;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load email preview.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    this.currentDate = now.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Navigate back to email details
  back(): void {
    this.router.navigate(['/admin/emails']);
  }

  goToDetails(): void {
    if (this.email) {
      this.router.navigate(['/admin/emails', this.email.emailId]);
    }
  }

  // Get sanitized HTML content for email body
  get sanitizedEmailBody(): SafeHtml {
    if (!this.email?.emailBody) {
      return this.sanitizer.bypassSecurityTrustHtml('<p style="color: #5f6368;">No email content available.</p>');
    }
    return this.sanitizer.bypassSecurityTrustHtml(this.email.emailBody);
  }

  // Format the email subject for display
  get displaySubject(): string {
    return this.email?.emailSubject || 'No Subject';
  }

  // Format sender info
  get senderName(): string {
    // Extract name from email or use a default
    const from = this.email?.emailFrom || 'sender@example.com';
    // Try to extract name before @ or use the full email
    const atIndex = from.indexOf('@');
    if (atIndex > 0) {
      const name = from.substring(0, atIndex);
      // Capitalize first letter
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return from;
  }

  get senderEmail(): string {
    return this.email?.emailFrom || 'sender@example.com';
  }

  get recipientEmail(): string {
    return this.email?.emailTo || 'recipient@example.com';
  }

  // Generate a realistic email timestamp
  get emailTimestamp(): string {
    if (this.email?.createdDate) {
      const date = new Date(this.email.createdDate);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    return 'Tue, Dec 23, 2025, 5:29 PM';
  }

  // Get initials for avatar
  get avatarInitial(): string {
    return this.senderName.charAt(0).toUpperCase();
  }

  // Get avatar background color based on sender
  get avatarColor(): string {
    const colors = [
      '#1a73e8', '#ea4335', '#fbbc04', '#34a853', 
      '#ff6d00', '#46bdc6', '#7baaf7', '#f07b72'
    ];
    const hash = this.senderEmail.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  // Check if email has label chips
  get hasLabels(): boolean {
    return true; // Always show Inbox label for preview
  }

  // Format template code as a label
  get templateLabel(): string {
    return this.email?.emailCode || 'Template';
  }

  // Track sidebar items
  trackBySidebarItem(index: number, item: GmailSidebarItem): string {
    return item.label;
  }
}