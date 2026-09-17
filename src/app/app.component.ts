/** Angular Imports */
import { Component } from '@angular/core';

/**
 * Root shell — same role as web-app AppComponent (simplified).
 */
@Component({
  selector: 'mifosx-web-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Mini Fineract Training';
}
