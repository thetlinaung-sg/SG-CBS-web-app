/** Angular Imports */
import { Component, OnInit } from '@angular/core';

/** Custom Services */
import { HomeService } from './home.service';

/**
 * Home / Welcome component — sample only (like web-app home welcome card).
 * Team: grow this module or add sibling feature modules step by step.
 */
@Component({
  selector: 'mifosx-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  /** Sample welcome title. */
  welcomeTitle = 'Welcome';

  /** Optional health ping from backend (shows FE ↔ API wiring). */
  apiStatus = 'checking…';

  constructor(private readonly homeService: HomeService) {}

  ngOnInit(): void {
    this.homeService.getHealth().subscribe({
      next: (res) => (this.apiStatus = res.status || 'UP'),
      error: () => (this.apiStatus = 'DOWN (start backend on :8088)')
    });
  }
}
