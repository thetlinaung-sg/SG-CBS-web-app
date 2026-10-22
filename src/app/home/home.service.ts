/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SavingsDashboardSummary {
  totalAccounts: number;
  byStatus: {
    SUBMITTED: number;
    APPROVED: number;
    ACTIVE: number;
    FROZEN: number;
    CLOSED: number;
  };
  totalLedgerBalance: number;
  totalAvailableBalance: number;
  totalActiveHolds: number;
}

export interface SavingsDashboardActivityItem {
  auditId: number;
  savingsAccountId: number;
  accountNo: string;
  clientDisplayName: string;
  eventType: string;
  summary: string;
  amount: number | null;
  performedBy: string;
  performedOn: string;
}

export interface SavingsDashboardActivity {
  items: SavingsDashboardActivityItem[];
  limit: number;
}

export interface MakerCheckerInboxCount {
  totalElements: number;
}

/**
 * Home service — same idea as web-app/src/app/home/home.service.ts (sample).
 * Calls the mini-fineract provider via the Angular proxy.
 */
@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly apiBase = '/mini-fineract-provider/api/v1';

  constructor(private readonly http: HttpClient) {}

  getHealth(): Observable<{ status: string; app?: string }> {
    return this.http.get<{ status: string; app?: string }>(`${this.apiBase}/health`);
  }

  getDashboardSummary(): Observable<SavingsDashboardSummary> {
    return this.http.get<SavingsDashboardSummary>(
      `${this.apiBase}/savings/dashboard/summary`
    );
  }

  getDashboardActivity(limit = 10): Observable<SavingsDashboardActivity> {
    return this.http.get<SavingsDashboardActivity>(
      `${this.apiBase}/savings/dashboard/activity?limit=${limit}`
    );
  }

  getPendingApprovalCount(): Observable<MakerCheckerInboxCount> {
    return this.http.get<MakerCheckerInboxCount>(
      `${this.apiBase}/savings/makerchecker?status=PENDING&page=0&size=1`
    );
  }
}
