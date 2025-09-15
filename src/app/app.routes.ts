// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/user-admin/user-admin-module')
        .then(m => m.UserAdminModule),
  },
  {
    path: 'bidder',   // public/customer portal
    loadChildren: () =>
      import('./features/bidder-portal/bidder/bidder-module')
        .then(m => m.BidderModule),
  },

  // Default & wildcard go to the bidder portal
  { path: '', pathMatch: 'full', redirectTo: 'bidder' },
  { path: '**', redirectTo: 'bidder' },
];
