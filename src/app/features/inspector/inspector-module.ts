import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InspectorRoutingModule } from './inspector-routing-module';
import { InspectorsLogin } from './pages/inspectors-login/inspectors-login';
import { InspectorsForgotpassword } from './pages/inspectors-forgotpassword/inspectors-forgotpassword';
import { InspectorsResetpassword } from './pages/inspectors-resetpassword/inspectors-resetpassword';
import { Dashboard } from './pages/dashboard/dashboard';
import { Inspections } from './pages/inspections/inspections';
import { InspectorsAccdetails } from './pages/inspectors-accdetails/inspectors-accdetails';
import { InspectorChangePassword } from './pages/inspector-change-password/inspector-change-password';


@NgModule({
  imports: [
    CommonModule,
    InspectorRoutingModule,
    InspectorsLogin,
    InspectorsForgotpassword,
    InspectorsResetpassword,
    Dashboard,
    Inspections,
    InspectorsAccdetails,
    InspectorChangePassword
  ]
})
export class InspectorModule { }
