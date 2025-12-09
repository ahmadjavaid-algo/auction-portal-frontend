import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { inspectorauthGuard } from '../../guards/inspectorauth.guard';
import { InspectorsLogin } from './pages/inspectors-login/inspectors-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { InspectorsForgotpassword } from './pages/inspectors-forgotpassword/inspectors-forgotpassword';
import { InspectorsResetpassword } from './pages/inspectors-resetpassword/inspectors-resetpassword';
import { InspectorLayout } from './inspector-layout/inspector-layout';
import { Inspections } from './pages/inspections/inspections';
import { InspectorsAccdetails } from './pages/inspectors-accdetails/inspectors-accdetails';
import { InspectorChangePassword } from './pages/inspector-change-password/inspector-change-password';
import { Guides } from './pages/guides/guides';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  
  { path: 'login', component: InspectorsLogin, title: 'Inspector Login' },
  { path: 'forgot-password', component: InspectorsForgotpassword, title: 'Forgot Password' },
  { path: 'auth/reset-password', component: InspectorsResetpassword, title: 'Reset Password' },

  {
    path: '',
    component: InspectorLayout,
    canActivate: [inspectorauthGuard],
    children: [
      { path: 'inspection', component: Inspections, title: 'Inspection' },
      { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
      { path: 'accdetails', component: InspectorsAccdetails, title: 'Account Details' },
      { path: 'change-password', component: InspectorChangePassword , title: 'Change Password'},
      { path: 'guides', component: Guides , title: 'Guide'},
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InspectorRoutingModule { }
