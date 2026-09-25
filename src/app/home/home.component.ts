/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

/** Custom Imports */
import { activities } from './activities';

/** Custom Services */
import { AuthSessionService } from '../core/auth-session.service';
import { HomeService } from './home.service';

interface TrainingUser {
  username?: string;
  displayName?: string;
}

/**
 * Home / Welcome — layout mirrors web-app home (welcome card + activity search).
 */
@Component({
  selector: 'mifosx-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  /** Username of authenticated user (MifosX home shows this). */
  username = 'User';

  /** Search text for activity autocomplete. */
  searchText = new FormControl('');

  /** Filtered activities for the dropdown. */
  filteredActivities: Observable<{ activity: string; path: string }[]>;

  /** All searchable activities. */
  private readonly allActivities = activities;

  /** Optional health ping (training wiring check). */
  apiStatus = 'checking…';

  constructor(
    private readonly homeService: HomeService,
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {
    this.filteredActivities = this.searchText.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : '')),
      map((name) => (name ? this.filterActivity(name) : this.allActivities.slice()))
    );
  }

  ngOnInit(): void {
    this.username = this.resolveUsername();
    this.homeService.getHealth().subscribe({
      next: (res) => (this.apiStatus = res.status || 'UP'),
      error: () => (this.apiStatus = 'DOWN')
    });
  }

  goToActivity(path: string): void {
    this.searchText.setValue('');
    this.router.navigateByUrl(path);
  }

  logout(): void {
    this.authSession.clear();
    this.router.navigateByUrl('/login');
  }

  private resolveUsername(): string {
    const raw = this.authSession.getUserRaw();
    if (!raw) {
      return 'User';
    }
    try {
      const user = JSON.parse(raw) as TrainingUser;
      return user.username || user.displayName || 'User';
    } catch {
      return 'User';
    }
  }

  private filterActivity(activityName: string): { activity: string; path: string }[] {
    const filterValue = activityName.toLowerCase();
    return this.allActivities.filter(
      (activity) => activity.activity.toLowerCase().indexOf(filterValue) === 0
    );
  }
}
