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
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { filter } from 'rxjs/operators';

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

  hasUnread = true;

  pageTitle = 'Dashboard';

  get displayName(): string {
    const u = this.auth.currentUser;
    if (!u) return 'Inspector';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.userName || 'Inspector';
  }

  get initials(): string {
    const name = this.displayName;
    const parts = name.split(' ').filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase() || 'I';
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
      });

    this.updatePageTitle();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private updatePageTitle(): void {
    const url = this.router.url;
    if (url.includes('/dashboard')) {
      this.pageTitle = 'Dashboard';
    } else if (url.includes('/inspection')) {
      this.pageTitle = 'Inspections';
    } else if (url.includes('/schedule')) {
      this.pageTitle = 'Schedule';
    } else if (url.includes('/reports')) {
      this.pageTitle = 'Reports';
    } else if (url.includes('/guides')) {
      this.pageTitle = 'Guides';
    } else if (url.includes('/accdetails')) {
      this.pageTitle = 'Profile';
    } else if (url.includes('/change-password')) {
      this.pageTitle = 'Change Your Password';
    } else {
      this.pageTitle = 'Dashboard';
    }
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
        queryParams: { returnUrl: '/inspector/accdetails' }
      });
      return;
    }

    this.router.navigate(['/inspector/accdetails']);
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