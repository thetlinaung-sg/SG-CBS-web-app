/** Angular Imports */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Custom Modules */
import { HomeRoutingModule } from './home-routing.module';

/** Custom Components */
import { HomeComponent } from './home.component';

/**
 * Home Module
 *
 * Same shape as web-app/src/app/home/home.module.ts (sample only).
 * Team: add Clients / Products / Accounts feature modules next to this.
 */
@NgModule({
  imports: [CommonModule, HomeRoutingModule],
  declarations: [HomeComponent]
})
export class HomeModule {}
