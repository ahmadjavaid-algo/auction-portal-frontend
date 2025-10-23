import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BiddersLogin } from './pages/bidders-login/bidders-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { bidderauthGuard } from '../../../guards/bidderauth.guard';
import { BidderLayout } from './bidder-layout/bidder-layout';
import { BiddersResetpassword } from './pages/bidders-resetpassword/bidders-resetpassword';
import { BiddersForgotpassword } from './pages/bidders-forgotpassword/bidders-forgotpassword';
import { BiddersSignup } from './pages/bidders-signup/bidders-signup';
import { BiddersAccdetails } from './pages/bidders-accdetails/bidders-accdetails';
import { AuctionsDetails } from './pages/auctions-details/auctions-details';
import { AuctionsList } from './pages/auctions-list/auctions-list';
import { ProductDetails } from './pages/product-details/product-details';
import { AllauctionsDetails } from './pages/allauctions-details/allauctions-details';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Public/auth screens
  { path: 'login', component: BiddersLogin, title: 'Bidder Login' },
  { path: 'forgot-password', component: BiddersForgotpassword, title: 'Forgot Password' }, // public
  { path: 'auth/reset-password', component: BiddersResetpassword, title: 'Reset Password' }, // public (matches emailed path, final URL will be /admin/auth/reset-password)
  { path: 'signup', component: BiddersSignup, title: 'Sign Up' },  
  // Protected area
    {
      path: '',
      component: BidderLayout,
      canActivate: [bidderauthGuard],
      children: [
        { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
        {path: 'accdetails', component: BiddersAccdetails, title: 'Account Details' },
        { path: 'auctions', component: AuctionsList, title: 'Auctions' },
        { path: 'auctions/:id', component: AuctionsDetails, title: 'Auction Details' },
        { path: 'auctions/:id/:id', component: ProductDetails, title: 'Product Details' },
        { path: 'allauctions', component: AllauctionsDetails, title: 'All Auctions' },
      ]
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BidderRoutingModule { }
