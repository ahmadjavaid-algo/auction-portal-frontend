import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BiddersLogin } from './pages/bidders-login/bidders-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { bidderauthGuard } from '../../../guards/bidderauth.guard';
import { BidderLayout } from './bidder-layout/bidder-layout';
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Public/auth screens
  { path: 'login', component: BiddersLogin, title: 'Bidder Login' },
    // Protected area
    {
      path: '',
      component: BidderLayout,
      canActivate: [bidderauthGuard],
      children: [
        { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
        { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
      ]
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BidderRoutingModule { }
