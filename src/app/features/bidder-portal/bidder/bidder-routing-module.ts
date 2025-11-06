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
import { Pricing } from './pages/pricing/pricing';
import { NewcarsList } from './pages/newcars-list/newcars-list';
import { Info } from './pages/info/info';
import { FavouritesList } from './pages/favourites-list/favourites-list';
import { Auctionbid } from './pages/auctionbid/auctionbid';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // public
  { path: 'login', component: BiddersLogin, title: 'Bidder Login' },
  { path: 'forgot-password', component: BiddersForgotpassword, title: 'Forgot Password' },
  { path: 'auth/reset-password', component: BiddersResetpassword, title: 'Reset Password' },
  { path: 'signup', component: BiddersSignup, title: 'Sign Up' },

  {
    path: '',
    component: BidderLayout,
    canActivate: [bidderauthGuard],
    children: [
      { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      { path: 'accdetails', component: BiddersAccdetails, title: 'Account Details' },

      // auction list + summary
      { path: 'auctions', component: AuctionsList, title: 'Auctions' },
      { path: 'auctions/:auctionId', component: AuctionsDetails, title: 'Auction Details' },

      // 🚀 live bidding page (what you want to open)
      { 
        path: 'auctions/:auctionId/:inventoryAuctionId',
        component: Auctionbid,
        title: 'Live Auction'
      },

      // 🔍 detailed vehicle page (kept separate)
      {
        path: 'auctions/:auctionId/:inventoryAuctionId/details',
        component: ProductDetails,
        title: 'Vehicle Details'
      },

      { path: 'allauctions', component: AllauctionsDetails, title: 'All Auctions' },
      { path: 'pricing', component: Pricing, title: 'Pricing' },
      { path: 'newcars-list', component: NewcarsList, title: 'New Cars' },
      { path: 'info', component: Info, title: 'Reach Us' },
      { path: 'favourites-list', component: FavouritesList, title: 'Favourites' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BidderRoutingModule {}
