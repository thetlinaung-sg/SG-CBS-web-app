import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

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
    closureFeeAmount: number;
    status: string;
}

@Component({
    selector: 'app-edit-savings-product',
    templateUrl: './edit-savings-product.component.html',
    styleUrls: ['./edit-savings-product.component.scss']
})
export class EditSavingsProductComponent implements OnInit {

    productId!: number;

    loading = false;
    loadingProduct = true;
    errorMessage = '';

    private readonly apiUrl =
        '/mini-fineract-provider/api/v1/savingsproducts';

    productForm = this.fb.group({
        name: ['', Validators.required],

        shortName: [
            '',
            Validators.required
        ],

        description: [''],

        currencyCode: [
            'MMK',
            Validators.required
        ],

        nominalAnnualInterestRate: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        minOpeningBalance: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        minRequiredBalance: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        lockinPeriod: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        lockinPeriodType: [
            'DAYS',
            Validators.required
        ],

        withdrawalFeeAmount: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        closureFeeAmount: [
            0,
            [
                Validators.required,
                Validators.min(0)
            ]
        ],

        status: [
            'ACTIVE',
            Validators.required
        ]
    });

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {

        this.productId = Number(
            this.route.snapshot.paramMap.get('id')
        );

        if (!this.productId) {
            this.errorMessage =
                'Invalid savings product ID.';

            this.loadingProduct = false;
            return;
        }

        this.loadProduct();
    }

    loadProduct(): void {

        const headers = this.getAuthHeaders();

        this.http.get<SavingsProduct>(
            `${this.apiUrl}/${this.productId}`,
            { headers }
        ).subscribe({

            next: (product) => {

                this.productForm.patchValue({

                    name:
                        product.name,

                    shortName:
                        product.shortName,

                    description:
                        product.description || '',

                    currencyCode:
                        product.currencyCode,

                    nominalAnnualInterestRate:
                        product.nominalAnnualInterestRate,

                    minOpeningBalance:
                        product.minOpeningBalance,

                    minRequiredBalance:
                        product.minRequiredBalance,

                    lockinPeriod:
                        product.lockinPeriod,

                    lockinPeriodType:
                        product.lockinPeriodType,

                    withdrawalFeeAmount:
                        product.withdrawalFeeAmount,

                    closureFeeAmount:
                        product.closureFeeAmount,

                    status:
                        product.status
                });

                this.loadingProduct = false;
            },

            error: (error) => {

                console.error(
                    'Failed to load savings product:',
                    error
                );

                this.errorMessage =
                    'Unable to load savings product.';

                this.loadingProduct = false;
            }
        });
    }

    update(): void {

        if (this.productForm.invalid) {

            this.productForm.markAllAsTouched();

            return;
        }

        this.loading = true;
        this.errorMessage = '';

        const headers = this.getAuthHeaders();

        this.http.put(
            `${this.apiUrl}/${this.productId}`,
            this.productForm.getRawValue(),
            { headers }
        ).subscribe({

            next: () => {

                this.loading = false;

                this.router.navigate([
                    '/savingsproducts'
                ]);
            },

            error: (error) => {

                console.error(
                    'Failed to update savings product:',
                    error
                );

                this.errorMessage =
                    error?.error?.message ||
                    'Unable to update savings product.';

                this.loading = false;
            }
        });
    }

    cancel(): void {

        this.router.navigate([
            '/savingsproducts'
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