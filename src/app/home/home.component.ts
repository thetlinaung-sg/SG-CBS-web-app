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
import {
  HomeService,
  SavingsDashboardActivityItem,
  SavingsDashboardSummary
} from './home.service';

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

  /** Username of authenticated user. */
  username = 'User';

  /** Search text for activity autocomplete. */
  searchText = new FormControl('');

  /** Filtered activities for the dropdown. */
  filteredActivities: Observable<{ activity: string; path: string }[]>;

  /** All searchable activities. */
  private readonly allActivities = activities;

  /** Optional health ping. */
  apiStatus = 'checking…';

  summary: SavingsDashboardSummary | null = null;
  recentActivity: SavingsDashboardActivityItem[] = [];
  pendingApprovalCount = 0;
  approvalsLoading = true;
  summaryLoading = true;
  activityLoading = true;
  summaryError = '';
  activityError = '';

  constructor(
    private readonly homeService: HomeService,
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) {
    this.filteredActivities = this.searchText.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : '')),
      map((name) =>
        name
          ? this.filterActivity(name)
          : this.allActivities.slice()
      )
    );
  }

  ngOnInit(): void {
    this.username = this.resolveUsername();
    this.refreshDashboard();

    this.homeService.getHealth().subscribe({
      next: (res) => {
        this.apiStatus = res.status || 'UP';
      },
      error: () => {
        this.apiStatus = 'DOWN';
      }
    });
  }

  refreshDashboard(): void {
    this.summaryLoading = true;
    this.activityLoading = true;
    this.approvalsLoading = true;
    this.summaryError = '';
    this.activityError = '';

    this.homeService.getDashboardSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.summaryLoading = false;
      },
      error: (error) => {
        console.error('Failed to load savings dashboard summary:', error);
        this.summaryError = 'Unable to load savings overview.';
        this.summaryLoading = false;
      }
    });

    this.homeService.getDashboardActivity().subscribe({
      next: (activity) => {
        this.recentActivity = activity.items;
        this.activityLoading = false;
      },
      error: (error) => {
        console.error('Failed to load recent savings activity:', error);
        this.activityError = 'Unable to load recent savings activity.';
        this.activityLoading = false;
      }
    });

    this.homeService.getPendingApprovalCount().subscribe({
      next: (response) => {
        this.pendingApprovalCount = response.totalElements;
        this.approvalsLoading = false;
      },
      error: (error) => {
        console.error('Failed to load pending approval count:', error);
        this.approvalsLoading = false;
      }
    });
  }

  openSavingsList(status?: string): void {
    this.router.navigate(['/savingsaccounts'], {
      queryParams: { status: status || null, page: 0 }
    });
  }

  openSavingsAccount(accountId: number): void {
    this.router.navigate(['/savingsaccounts', accountId]);
  }

  openMakerCheckerInbox(): void {
    this.router.navigateByUrl('/savings/makerchecker');
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

  private filterActivity(
    activityName: string
  ): { activity: string; path: string }[] {

    const filterValue = activityName.toLowerCase();

    return this.allActivities.filter(
      (activity) =>
        activity.activity
          .toLowerCase()
          .indexOf(filterValue) === 0
    );
  }
}
