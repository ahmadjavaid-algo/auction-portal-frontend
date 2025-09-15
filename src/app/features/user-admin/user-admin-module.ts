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

import { EmailsList } from './pages/emails-list/emails-list';
import { EmailsDetails } from './pages/emails-details/emails-details';
import { UsersForgotpassword } from './pages/users-forgotpassword/users-forgotpassword';
import { UsersResetpassword } from './pages/users-resetpassword/users-resetpassword'; 
import { BiddersList } from './pages/bidders-list/bidders-list';
import { BiddersDetails } from './pages/bidders-details/bidders-details';
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
    RolesDetails,
    EmailsList,
    EmailsDetails,
    UsersForgotpassword,
    UsersResetpassword ,
    BiddersList,
    BiddersDetails
  ]
})
export class UserAdminModule {}
