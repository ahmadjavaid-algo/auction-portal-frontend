import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/user-admin/user-admin-module').then(m => m.UserAdminModule)
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin/login' },
  { path: '**', redirectTo: 'admin/login' }
];
