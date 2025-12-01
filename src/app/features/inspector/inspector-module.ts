import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InspectorRoutingModule } from './inspector-routing-module';
import { InspectorsLogin } from './pages/inspectors-login/inspectors-login';
import { InspectorsForgotpassword } from './pages/inspectors-forgotpassword/inspectors-forgotpassword';
import { InspectorsResetpassword } from './pages/inspectors-resetpassword/inspectors-resetpassword';
import { Dashboard } from './pages/dashboard/dashboard';


@NgModule({
  imports: [
    CommonModule,
    InspectorRoutingModule,
    InspectorsLogin,
    InspectorsForgotpassword,
    InspectorsResetpassword,
    Dashboard
  ]
})
export class InspectorModule { }
