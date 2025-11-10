import {
  Component, ElementRef, HostListener, ViewChild, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayout {
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  dropdownOpen = false;
  sidebarCollapsed = false;

  @ViewChild('dropdown') dropdownRef!: ElementRef;

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Admin';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Admin';
  }

  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }
  toggleSidebar(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (this.dropdownOpen && this.dropdownRef && !this.dropdownRef.nativeElement.contains(ev.target)) {
      this.dropdownOpen = false;
    }
  }

// admin-layout.ts (only method changed)
  changePassword(): void {
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/admin/login'], {
        queryParams: { returnUrl: '/admin/change-password' }
      });
      return;
    }

    this.router.navigate(['/admin/change-password']);
  }


  logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
