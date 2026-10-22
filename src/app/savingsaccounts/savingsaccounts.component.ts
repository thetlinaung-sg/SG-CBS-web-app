import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

interface SavingsAccount {
  id: number;
  clientId: number;
  productId: number;
  accountNo: string;
  status: string;
  balance: number;
  availableBalance?: number;
  createdOn: string;

  clientName?: string;
  productName?: string;
  currency?: {
    code?: string;
  };
  currencyCode?: string;
}

interface PagedSavingsAccounts {
  content: SavingsAccount[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

interface Client {
  id: number;
  accountNo?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
}

interface SavingsProduct {
  id: number;
  name: string;
}

@Component({
  selector: 'app-savings-accounts',
  standalone: false,
  templateUrl: './savingsaccounts.component.html',
  styleUrls: ['./savingsaccounts.component.scss']
})
export class SavingsAccountsComponent implements OnInit {

  accounts: SavingsAccount[] = [];

  clients: Client[] = [];
  products: SavingsProduct[] = [];

  searchText = '';
  clientIdText = '';
  statusFilter = '';
  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  sort = 'id,asc';

  loading = true;
  errorMessage = '';

  processingId: number | null = null;

  private apiBase = '/mini-fineract-provider/api/v1';
  private lastQuerySignature = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.readQueryParams(this.route.snapshot.queryParamMap);
    this.lastQuerySignature = this.getQuerySignature(this.route.snapshot.queryParamMap);
    this.route.queryParamMap.subscribe(params => {
      const signature = this.getQuerySignature(params);
      if (signature !== this.lastQuerySignature) {
        this.readQueryParams(params);
        this.lastQuerySignature = signature;
        this.loadAccounts();
      }
    });
    this.writeQueryParamsAndLoad();
    this.loadClients();
    this.loadProducts();
  }

  private getAuthHeaders(): HttpHeaders {
    const authHeader = localStorage.getItem('authHeader');

    return authHeader
      ? new HttpHeaders({
        Authorization: authHeader
      })
      : new HttpHeaders();
  }

  loadAccounts(): void {

    this.loading = true;
    this.errorMessage = '';

    let params = new HttpParams()
      .set('page', this.page)
      .set('size', this.pageSize)
      .set('sort', this.sort);
    if (this.searchText.trim()) {
      params = params.set('search', this.searchText.trim());
    }
    if (this.clientIdText.trim()) {
      params = params.set('clientId', this.clientIdText.trim());
    }
    if (this.statusFilter) {
      params = params.set('status', this.statusFilter);
    }

    this.http.get<PagedSavingsAccounts>(
      `${this.apiBase}/savingsaccounts`,
      {
        headers: this.getAuthHeaders(),
        params
      }
    ).subscribe({

      next: (data) => {
        this.accounts = data.content;
        this.page = data.page;
        this.pageSize = data.size;
        this.totalElements = data.totalElements;
        this.totalPages = data.totalPages;
        this.sort = data.sort;
        this.loading = false;

      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to load savings accounts.';

        this.loading = false;

      }

    });
  }

  applyFilters(): void {
    this.page = 0;
    this.writeQueryParamsAndLoad();
  }

  clearFilters(): void {
    this.searchText = '';
    this.clientIdText = '';
    this.statusFilter = '';
    this.page = 0;
    this.writeQueryParamsAndLoad();
  }

  changePageSize(size: string): void {
    this.pageSize = Number(size);
    this.page = 0;
    this.writeQueryParamsAndLoad();
  }

  changePage(page: number): void {
    if (page < 0 || (this.totalPages > 0 && page >= this.totalPages)) {
      return;
    }
    this.page = page;
    this.writeQueryParamsAndLoad();
  }

  changeSort(property: 'id' | 'accountNo' | 'balance'): void {
    const [currentProperty, currentDirection] = this.sort.split(',');
    const direction =
      currentProperty === property && currentDirection === 'asc'
        ? 'desc'
        : 'asc';
    this.sort = `${property},${direction}`;
    this.page = 0;
    this.writeQueryParamsAndLoad();
  }

  sortIndicator(property: 'id' | 'accountNo' | 'balance'): string {
    const [currentProperty, direction] = this.sort.split(',');
    return currentProperty === property
      ? (direction === 'asc' ? '▲' : '▼')
      : '';
  }

  get firstItem(): number {
    return this.totalElements === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get lastItem(): number {
    return Math.min((this.page + 1) * this.pageSize, this.totalElements);
  }

  getAvailableBalance(account: SavingsAccount): number {
    return account.availableBalance === undefined
      ? account.balance
      : account.availableBalance;
  }

  private readQueryParams(params: ParamMap): void {
    this.searchText = params.get('search') || '';
    this.clientIdText = params.get('clientId') || '';
    this.statusFilter = params.get('status') || '';
    this.page = Number(params.get('page') || 0);
    this.pageSize = Number(params.get('size') || 10);
    this.sort = params.get('sort') || 'id,asc';
  }

  private getQuerySignature(params: ParamMap): string {
    return ['search', 'clientId', 'status', 'page', 'size', 'sort']
      .map(key => params.get(key) || '')
      .join('|');
  }

  private writeQueryParamsAndLoad(): void {
    const queryParams = {
      search: this.searchText.trim() || null,
      clientId: this.clientIdText.trim() || null,
      status: this.statusFilter || null,
      page: this.page,
      size: this.pageSize,
      sort: this.sort
    };
    this.lastQuerySignature = [
      queryParams.search || '',
      queryParams.clientId || '',
      queryParams.status || '',
      queryParams.page,
      queryParams.size,
      queryParams.sort
    ].join('|');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadAccounts();
  }

  loadClients(): void {

    this.http.get<Client[]>(
      `${this.apiBase}/clients`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        console.log('CLIENT DATA:', data);

        this.clients = data;

      },

      error: (error) => {

        console.error(
          'Failed to load clients:',
          error
        );

      }

    });
  }

  loadProducts(): void {

    this.http.get<SavingsProduct[]>(
      `${this.apiBase}/savingsproducts`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.products = data;

      },

      error: (error) => {

        console.error(
          'Failed to load savings products:',
          error
        );

      }

    });
  }

  getClientName(clientId: number): string {

    const client = this.clients.find(
      c => Number(c.id) === Number(clientId)
    );

    if (!client) {
      return `Client #${clientId}`;
    }

    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
  }
  getProductName(productId: number): string {

    const product = this.products.find(
      p => Number(p.id) === Number(productId)
    );

    return product
      ? product.name
      : `Product #${productId}`;
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  createAccount(): void {
    this.router.navigate([
      '/savingsaccounts/create'
    ]);
  }

  viewAccount(id: number): void {
    this.router.navigate([
      '/savingsaccounts',
      id
    ]);
  }

  editAccount(id: number): void {

    this.router.navigate([
      '/savingsaccounts',
      id,
      'edit'
    ]);

  }

  approve(account: SavingsAccount): void {

    this.processingId = account.id;
    this.errorMessage = '';

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${account.id}/approve`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: () => {

        this.processingId = null;

        this.loadAccounts();

      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to approve account.';

        this.processingId = null;

      }

    });
  }

  activate(account: SavingsAccount): void {

    this.processingId = account.id;
    this.errorMessage = '';

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${account.id}/activate`,
      {},
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: () => {

        this.processingId = null;

        this.loadAccounts();

      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to activate account.';

        this.processingId = null;

      }

    });
  }
}