import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';
import { UsersDetails } from './pages/users-details/users-details';
import { RolesList } from './pages/roles-list/roles-list';
import { RolesDetails } from './pages/roles-details/roles-details';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from '../../guards/auth.guard';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { EmailsList } from './pages/emails-list/emails-list';
import { EmailsDetails } from './pages/emails-details/emails-details';
import { UsersForgotpassword } from './pages/users-forgotpassword/users-forgotpassword';
import { UsersResetpassword } from './pages/users-resetpassword/users-resetpassword'; // ← NEW

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Public/auth screens
  { path: 'login', component: UsersLogin, title: 'Admin Login' },
  { path: 'forgot-password', component: UsersForgotpassword, title: 'Forgot Password' }, // public
  { path: 'auth/reset-password', component: UsersResetpassword, title: 'Reset Password' }, // public (matches emailed path, final URL will be /admin/auth/reset-password)

  // Protected area
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
      { path: 'users', component: UsersList, title: 'Users' },
      { path: 'users/:id', component: UsersDetails, title: 'User Details' },
      { path: 'roles', component: RolesList, title: 'Roles' },
      { path: 'roles/:id', component: RolesDetails, title: 'Role Details' },
      { path: 'emails', component: EmailsList, title: 'Emails' },
      { path: 'emails/:id', component: EmailsDetails, title: 'Email Details' },

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAdminRoutingModule {}
