import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InspectorAuthService } from '../../../services/inspectorauth';

@Component({
  selector: 'app-inspector-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './inspector-layout.html',
  styleUrls: ['./inspector-layout.scss']
})
export class InspectorLayout implements OnInit, OnDestroy {
  private auth = inject(InspectorAuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  @ViewChild('userDropdown') userDropdownRef!: ElementRef;

  dropdownOpen = false;
  railCollapsed = false;

  // placeholder for future notifications integration
  hasUnread = false;

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Inspector';
    const name = [u.firstName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Inspector';
  }

  ngOnInit(): void {
    // hook for future inspector init logic
  }

  ngOnDestroy(): void {
    // hook for cleanup if needed later
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleRail(): void {
    this.railCollapsed = !this.railCollapsed;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (
      this.dropdownOpen &&
      this.userDropdownRef &&
      !this.userDropdownRef.nativeElement.contains(target)
    ) {
      this.dropdownOpen = false;
    }
  }

  goProfile(ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/inspector/login'], {
        queryParams: { returnUrl: '/inspector/profile' }
      });
      return;
    }

    this.router.navigate(['/inspector/profile']);
  }

  changePassword(): void {
    this.dropdownOpen = false;

    if (!this.auth.isAuthenticated || !this.auth.currentUser?.userId) {
      this.router.navigate(['/inspector/login'], {
        queryParams: { returnUrl: '/inspector/change-password' }
      });
      return;
    }

    this.router.navigate(['/inspector/change-password']);
  }

  logout(): void {
    this.dropdownOpen = false;

    this.auth.logout();
    this.router.navigate(['/inspector/login']);
    this.snack.open('Signed out from Inspector workspace.', 'Close', {
      duration: 2500
    });
  }
}
