import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersList } from './pages/users-list/users-list';
import { UsersLogin } from './pages/users-login/users-login';
import { authGuard } from '../../guards/auth.guard';
import { UsersDetails } from './pages/users-details/users-details';
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: UsersLogin, title: 'Admin Login' },


  { path: 'users', component: UsersList, title: 'Users', canActivate: [authGuard] },
  { path: 'users/:id', component: UsersDetails, title: 'User Details', canActivate: [authGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAdminRoutingModule {}
