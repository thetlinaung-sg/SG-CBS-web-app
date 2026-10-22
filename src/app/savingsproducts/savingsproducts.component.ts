import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface SavingsProduct {
  id: number;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  nominalAnnualInterestRate: number;
  minOpeningBalance: number;
  minRequiredBalance: number;
  lockinPeriod: number;
  lockinPeriodType: string;
  withdrawalFeeAmount: number;
  status: string;
}

@Component({
  selector: 'app-savingsproducts',
  templateUrl: './savingsproducts.component.html',
  styleUrls: ['./savingsproducts.component.scss']
})
export class SavingsProductsComponent implements OnInit {

  products: SavingsProduct[] = [];

  loading = false;
  errorMessage = '';

  private readonly apiUrl =
    '/mini-fineract-provider/api/v1/savingsproducts';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';

    const headers = this.getAuthHeaders();

    this.http.get<SavingsProduct[]>(
      this.apiUrl,
      { headers }
    ).subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },

      error: (error) => {
        console.error(
          'Failed to load savings products:',
          error
        );

        this.errorMessage =
          'Unable to load savings products. Please check the backend connection.';

        this.loading = false;
      }
    });
  }

  createProduct(): void {
    this.router.navigate([
      '/savingsproducts/create'
    ]);
  }

  editProduct(id: number): void {
    this.router.navigate([
      '/savingsproducts',
      id,
      'edit'
    ]);
  }

  goBack(): void {
    this.router.navigate([
      '/dashboard'
    ]);
  }

  private getAuthHeaders(): HttpHeaders {

    const authHeader =
      localStorage.getItem('authHeader');

    if (authHeader) {
      return new HttpHeaders({
        Authorization: authHeader
      });
    }

    return new HttpHeaders();
  }
}