
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/user-admin/user-admin-module')
        .then(m => m.UserAdminModule),
  },
  {
    path: 'bidder',   
    loadChildren: () =>
      import('./features/bidder-portal/bidder/bidder-module')
        .then(m => m.BidderModule),
  },
  {
    path: 'inspector',   
    loadChildren: () =>
      import('./features/inspector/inspector-module')
        .then(m => m.InspectorModule),
  },

  
  { path: '', pathMatch: 'full', redirectTo: 'bidder' },
  { path: '**', redirectTo: 'bidder' },
];
