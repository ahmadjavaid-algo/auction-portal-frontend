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
import { AllauctionsDetails } from './pages/allauctions-details/allauctions-details';
import { Pricing } from './pages/pricing/pricing';
import { NewcarsList } from './pages/newcars-list/newcars-list';
import { Info } from './pages/info/info';
import { FavouritesList } from './pages/favourites-list/favourites-list';
import { Auctionbid } from './pages/auctionbid/auctionbid';
import { BidderChangePassword } from './pages/bidder-change-password/bidder-change-password';

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
    ProductDetails,
    AllauctionsDetails,
    Pricing,
    NewcarsList,
    Info,
    FavouritesList,
    Auctionbid,
    BidderChangePassword,
  ]
})
export class BidderModule { }
