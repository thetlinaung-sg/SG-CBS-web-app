import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthSessionService } from '../core/auth-session.service';

interface MakerCheckerRequest {
  id: number;
  savingsAccountId: number;
  accountNo: string;
  commandType: string;
  amount: number;
  status: string;
  madeBy: string;
  madeOn: string;
  checkedBy: string | null;
  checkedOn: string | null;
  rejectReason: string | null;
}

interface PagedMakerCheckerRequests {
  content: MakerCheckerRequest[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface TrainingUser {
  username?: string;
  displayName?: string;
}

@Component({
  selector: 'app-makerchecker',
  templateUrl: './makerchecker.component.html',
  styleUrls: ['./makerchecker.component.scss']
})
export class MakerCheckerComponent implements OnInit {
  requests: MakerCheckerRequest[] = [];
  status = 'PENDING';
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  currentUsername = 'User';
  loading = false;
  errorMessage = '';
  successMessage = '';
  processingId: number | null = null;

  private readonly apiBase = '/mini-fineract-provider/api/v1/savings/makerchecker';

  constructor(
    private readonly http: HttpClient,
    private readonly authSession: AuthSessionService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.currentUsername = this.resolveUsername();
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<PagedMakerCheckerRequests>(
      `${this.apiBase}?status=${encodeURIComponent(this.status)}&page=${this.page}&size=${this.size}`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response) => {
        this.requests = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.page = response.page;
        this.loading = false;
      },
      error: (error) => {
        console.error('Unable to load maker-checker requests:', error);
        this.errorMessage = error?.error?.message || 'Unable to load approval requests.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.page = 0;
    this.loadRequests();
  }

  changePage(page: number): void {
    if (page < 0 || (this.totalPages > 0 && page >= this.totalPages)) {
      return;
    }
    this.page = page;
    this.loadRequests();
  }

  canCheck(request: MakerCheckerRequest): boolean {
    return request.madeBy.toLowerCase() !== this.currentUsername.toLowerCase();
  }

  checkRequest(request: MakerCheckerRequest, command: 'approve' | 'reject'): void {
    let body: { reason?: string } | undefined;
    if (command === 'reject') {
      const reason = prompt('Optional reason for rejecting this request:');
      if (reason === null) {
        return;
      }
      body = { reason };
    } else if (!confirm(`Approve ${request.commandType} request #${request.id}?`)) {
      return;
    }

    this.processingId = request.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.http.post<MakerCheckerRequest>(
      `${this.apiBase}/${request.id}?command=${command}`,
      body || {},
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (updated) => {
        this.successMessage = command === 'approve'
          ? `Approved pending #${updated.id} (${updated.commandType}).`
          : `Rejected pending #${updated.id}.`;
        this.processingId = null;
        this.loadRequests();
      },
      error: (error) => {
        console.error(`Unable to ${command} maker-checker request:`, error);
        this.errorMessage = error?.error?.message || `Unable to ${command} request.`;
        this.processingId = null;
      }
    });
  }

  openAccount(accountId: number): void {
    this.router.navigate(['/savingsaccounts', accountId]);
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  private getAuthHeaders(): HttpHeaders {
    const authHeader = sessionStorage.getItem('trainingBasicAuth');
    return authHeader
      ? new HttpHeaders({ Authorization: `Basic ${authHeader}` })
      : new HttpHeaders();
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
}
