/** Angular Imports */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** App Imports */
import { SavingsProductsComponent } from './savingsproducts/savingsproducts.component';
import { CreateSavingsProductComponent } from './savingsproducts/create-savings-product/create-savings-product.component';
import { EditSavingsProductComponent } from './savingsproducts/edit-savings-product/edit-savings-product.component';
import { SavingsAccountsComponent } from './savingsaccounts/savingsaccounts.component';
import { CreateSavingsAccountComponent } from './savingsaccounts/create-savings-account/create-savings-account.component';
import { SavingsAccountDetailComponent } from './savings-account-detail/savings-account-detail.component';
import { MakerCheckerComponent } from './makerchecker/makerchecker.component';

const routes: Routes = [

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  {
    path: 'savingsproducts',
    component: SavingsProductsComponent
  },

  {
    path: 'savingsproducts/create',
    component: CreateSavingsProductComponent
  },

  {
    path: 'savingsproducts/:id/edit',
    component: EditSavingsProductComponent
  },

  {
    path: 'savingsaccounts',
    component: SavingsAccountsComponent
  },

  {
    path: 'savingsaccounts/create',
    component: CreateSavingsAccountComponent
  },
  {
    path: 'savingsaccounts/:id',
    component: SavingsAccountDetailComponent
  },
  {
    path: 'savings/makerchecker',
    component: MakerCheckerComponent
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true
    })
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule { }
