import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { inspectorauthGuard } from '../../guards/inspectorauth.guard';
import { InspectorsLogin } from './pages/inspectors-login/inspectors-login';
import { Dashboard } from './pages/dashboard/dashboard';
import { InspectorsForgotpassword } from './pages/inspectors-forgotpassword/inspectors-forgotpassword';
import { InspectorsResetpassword } from './pages/inspectors-resetpassword/inspectors-resetpassword';
import { InspectorLayout } from './inspector-layout/inspector-layout';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Auth
  { path: 'login', component: InspectorsLogin, title: 'Inspector Login' },
  { path: 'forgot-password', component: InspectorsForgotpassword, title: 'Forgot Password' },
  { path: 'auth/reset-password', component: InspectorsResetpassword, title: 'Reset Password' },

  {
    path: '',
    component: InspectorLayout,
    canActivate: [inspectorauthGuard],
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
export class InspectorRoutingModule { }
