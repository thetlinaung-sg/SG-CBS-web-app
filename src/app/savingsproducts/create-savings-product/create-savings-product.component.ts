import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
    selector: 'app-create-savings-product',
    templateUrl: './create-savings-product.component.html',
    styleUrls: ['./create-savings-product.component.scss']
})
export class CreateSavingsProductComponent {

    loading = false;
    errorMessage = '';

    private readonly apiUrl =
        '/mini-fineract-provider/api/v1/savingsproducts';

    productForm = this.fb.group({
        name: ['', Validators.required],
        shortName: ['', Validators.required],
        description: [''],
        currencyCode: ['MMK', Validators.required],

        nominalAnnualInterestRate: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        minOpeningBalance: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        minRequiredBalance: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        lockinPeriod: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        lockinPeriodType: [
            'DAYS',
            Validators.required
        ],

        withdrawalFeeAmount: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        closureFeeAmount: [
            0,
            [Validators.required, Validators.min(0)]
        ],

        status: [
            'ACTIVE',
            Validators.required
        ]
    });

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private router: Router
    ) { }

    save(): void {
        if (this.productForm.invalid) {
            this.productForm.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        const headers = this.getAuthHeaders();

        this.http.post(
            this.apiUrl,
            this.productForm.getRawValue(),
            { headers }
        ).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/savingsproducts']);
            },

            error: (error) => {
                console.error(
                    'Failed to create savings product:',
                    error
                );

                this.errorMessage =
                    error?.error?.message ||
                    'Unable to create savings product. Please try again.';

                this.loading = false;
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/savingsproducts']);
    }

    private getAuthHeaders(): HttpHeaders {
        const authHeader = localStorage.getItem('authHeader');

        if (authHeader) {
            return new HttpHeaders({
                Authorization: authHeader
            });
        }

        return new HttpHeaders();
    }
}