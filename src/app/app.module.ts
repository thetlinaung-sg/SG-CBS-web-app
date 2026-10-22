import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { HomeModule } from './home/home.module';
import { LoginModule } from './login/login.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';

import { BasicAuthInterceptor } from './core/basic-auth.interceptor';

import { SavingsProductsComponent } from './savingsproducts/savingsproducts.component';
import { CreateSavingsProductComponent } from './savingsproducts/create-savings-product/create-savings-product.component';
import { EditSavingsProductComponent } from './savingsproducts/edit-savings-product/edit-savings-product.component';

import { SavingsAccountsComponent } from './savingsaccounts/savingsaccounts.component';
import { CreateSavingsAccountComponent } from './savingsaccounts/create-savings-account/create-savings-account.component';

import { SavingsAccountDetailComponent } from './savings-account-detail/savings-account-detail.component';
import { MakerCheckerComponent } from './makerchecker/makerchecker.component';

@NgModule({
  declarations: [
    AppComponent,

    // Savings Products
    SavingsProductsComponent,
    CreateSavingsProductComponent,
    EditSavingsProductComponent,

    // Savings Accounts
    SavingsAccountsComponent,
    CreateSavingsAccountComponent,
    SavingsAccountDetailComponent,
    MakerCheckerComponent
  ],

  imports: [
    BrowserModule,
    HttpClientModule,

    // Template forms: [(ngModel)]
    FormsModule,

    // Reactive forms: [formGroup]
    ReactiveFormsModule,

    // Angular pipes: date, number, etc.
    // CommonModule is normally already available through BrowserModule,
    // so it does not need to be added here.

    HomeModule,
    LoginModule,
    UsersModule,
    ClientsModule,

    AppRoutingModule
  ],

  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BasicAuthInterceptor,
      multi: true
    }
  ],

  bootstrap: [AppComponent]
})
export class AppModule { }