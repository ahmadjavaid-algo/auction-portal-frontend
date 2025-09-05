import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAdminRoutingModule } from './user-admin-routing-module';

import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { RolesList } from './pages/roles-list/roles-list';
import { UsersDetails } from './pages/users-details/users-details';
import { RolesDetails } from './pages/roles-details/roles-details';
import { Dashboard } from './pages/dashboard/dashboard'; 

@NgModule({
  imports: [
    CommonModule,
    UserAdminRoutingModule,
    Dashboard,     
    UsersList,
    UsersLogin,
    AdminLayout,
    RolesList,
    UsersDetails,
    RolesDetails
  ]
})
export class UserAdminModule {}
