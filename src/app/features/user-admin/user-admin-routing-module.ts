import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';
import { UsersDetails } from './pages/users-details/users-details';
import { RolesList } from './pages/roles-list/roles-list';
import { RolesDetails } from './pages/roles-details/roles-details'; // ⬅️ add
import { authGuard } from '../../guards/auth.guard';
import { AdminLayout } from './layout/admin-layout/admin-layout';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Public
  { path: 'login', component: UsersLogin, title: 'Admin Login' },

  // Protected shell
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      { path: 'users', component: UsersList, title: 'Users' },
      { path: 'users/:id', component: UsersDetails, title: 'User Details' },
      { path: 'roles', component: RolesList, title: 'Roles' },
      { path: 'roles/:id', component: RolesDetails, title: 'Role Details' }, // ⬅️ add
      { path: '', pathMatch: 'full', redirectTo: 'users' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAdminRoutingModule {}
