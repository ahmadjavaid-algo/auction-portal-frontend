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
import { MakesModelsYearsCategoriesList } from './pages/makes-models-years-categories-list/makes-models-years-categories-list';
import { ProductsDetails } from './pages/products-details/products-details';
import { ProductsList } from './pages/products-list/products-list';
import { ProductsForm } from './pages/products-form/products-form';
import { InventoryDetails } from './pages/inventory-details/inventory-details';
import { InventoryForm } from './pages/inventory-form/inventory-form';
import { InventoryList } from './pages/inventory-list/inventory-list';
import { AuctionsList } from './pages/auctions-list/auctions-list';
import { AuctionsForm } from './pages/auctions-form/auctions-form';
import { AuctionsDetails } from './pages/auctions-details/auctions-details';
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
    BiddersDetails,
    MakesModelsYearsCategoriesList,
    ProductsDetails,
    ProductsList,
    ProductsForm,
    InventoryDetails,
    InventoryForm,
    InventoryList,
    AuctionsList,
    AuctionsForm,
    AuctionsDetails
  ]
})
export class UserAdminModule {}
