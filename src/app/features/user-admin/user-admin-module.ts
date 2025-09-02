import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAdminRoutingModule } from './user-admin-routing-module';

import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';

@NgModule({
  imports: [
    CommonModule,
    UserAdminRoutingModule,
    UsersList,
    UsersLogin
  ]
})
export class UserAdminModule {}
