import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BidderRoutingModule } from './bidder-routing-module';
import { BiddersLogin } from './pages/bidders-login/bidders-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { BidderLayout } from './bidder-layout/bidder-layout';
import { BiddersForgotpassword } from './pages/bidders-forgotpassword/bidders-forgotpassword';
import { BiddersResetpassword } from './pages/bidders-resetpassword/bidders-resetpassword';
import { BiddersSignup } from './pages/bidders-signup/bidders-signup';
import { BiddersAccdetails } from './pages/bidders-accdetails/bidders-accdetails';
import { AuctionsDetails } from './pages/auctions-details/auctions-details';
import { AuctionsList } from './pages/auctions-list/auctions-list';
import { ProductDetails } from './pages/product-details/product-details';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BidderRoutingModule,
    BiddersLogin,
    Dashboard,
    BidderLayout,
    BiddersForgotpassword,
    BiddersResetpassword,
    BiddersSignup,
    BiddersAccdetails,
    AuctionsDetails,
    AuctionsList,
    ProductDetails
  ]
})
export class BidderModule { }
