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
import { UsersResetpassword } from './pages/users-resetpassword/users-resetpassword'; 
import { BiddersList } from './pages/bidders-list/bidders-list';
import { BiddersDetails } from './pages/bidders-details/bidders-details';
import { MakesModelsYearsCategoriesList } from './pages/makes-models-years-categories-list/makes-models-years-categories-list';
import { ProductsDetails } from './pages/products-details/products-details';
import { ProductsList } from './pages/products-list/products-list';
import { InventoryDetails } from './pages/inventory-details/inventory-details';
import { InventoryList } from './pages/inventory-list/inventory-list';
import { AuctionsList } from './pages/auctions-list/auctions-list';
import { AuctionsDetails } from './pages/auctions-details/auctions-details';
import { InventoryImagesform } from './pages/inventory-imagesform/inventory-imagesform';
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  
  { path: 'login', component: UsersLogin, title: 'Admin Login' },
  { path: 'forgot-password', component: UsersForgotpassword, title: 'Forgot Password' }, 
  { path: 'auth/reset-password', component: UsersResetpassword, title: 'Reset Password' }, 

  
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
      { path: 'bidders', component: BiddersList, title: 'Bidders' },
      { path: 'bidders/:id', component: BiddersDetails, title: 'Bidder Details' },
      { path: 'make', component: MakesModelsYearsCategoriesList, title: 'Make' },
      { path: 'products', component: ProductsList, title: 'Products' },
      { path: 'products/:id', component: ProductsDetails, title: 'Product Details' },
      { path: 'inventory', component: InventoryList, title: 'Inventory' },
      { path: 'inventory/:id', component: InventoryDetails, title: 'Inventory Details' },
      { path: 'auctions', component: AuctionsList, title: 'Auctions' },
      { path: 'auctions/:id', component: AuctionsDetails, title: 'Auction Details' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAdminRoutingModule {}
