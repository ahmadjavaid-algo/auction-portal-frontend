import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAdminRoutingModule } from './user-admin-routing-module';

import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { RolesList } from './pages/roles-list/roles-list';
import { UsersDetails } from './pages/users-details/users-details';     // ⬅️ added (standalone)
import { RolesDetails } from './pages/roles-details/roles-details';     // ⬅️ added (standalone)

@NgModule({
  imports: [
    CommonModule,
    UserAdminRoutingModule,
    UsersList,
    UsersLogin,
    AdminLayout,
    RolesList,
    UsersDetails,   // ⬅️ added
    RolesDetails    // ⬅️ added
  ]
})
export class UserAdminModule {}
