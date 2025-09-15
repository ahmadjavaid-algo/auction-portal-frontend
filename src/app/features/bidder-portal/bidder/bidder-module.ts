import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BidderRoutingModule } from './bidder-routing-module';
import { BiddersLogin } from './pages/bidders-login/bidders-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { BidderLayout } from './bidder-layout/bidder-layout';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BidderRoutingModule,
    BiddersLogin,
    Dashboard,
    BidderLayout
  ]
})
export class BidderModule { }
