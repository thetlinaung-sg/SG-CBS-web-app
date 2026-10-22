import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface Client {
    id: number;
    firstName: string;
    middlename?: string;
    lastName: string;
    accountNo?: string;
    nrc?: string;
    mobileNo?: string;
    email?: string;
    status?: string;
}

interface SavingsProduct {
    id: number;
    name: string;
    shortName?: string;
    description?: string;
    currencyCode?: string;
    minOpeningBalance?: number;
    nominalAnnualInterestRate?: number;
    status?: string;
}

@Component({
    selector: 'app-create-savings-account',
    templateUrl: './create-savings-account.component.html',
    styleUrls: ['./create-savings-account.component.scss']
})
export class CreateSavingsAccountComponent implements OnInit {

    loading = false;

    loadingClients = false;
    loadingProducts = false;

    errorMessage = '';

    clients: Client[] = [];
    savingsProducts: SavingsProduct[] = [];

    private readonly apiUrl =
        '/mini-fineract-provider/api/v1/savingsaccounts';

    private readonly clientsApiUrl =
        '/mini-fineract-provider/api/v1/clients';

    private readonly productsApiUrl =
        '/mini-fineract-provider/api/v1/savingsproducts';

    accountForm = this.fb.group({

        clientId: [
            null as number | null,
            [
                Validators.required,
                Validators.min(1)
            ]
        ],

        productId: [
            null as number | null,
            [
                Validators.required,
                Validators.min(1)
            ]
        ],

        accountNo: [
            '',
            [
                Validators.required
            ]
        ]

    });

    constructor(
        private fb: FormBuilder,
        private http: HttpClient,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        const clientId = Number(this.route.snapshot.queryParamMap.get('clientId'));
        if (Number.isSafeInteger(clientId) && clientId > 0) {
            this.accountForm.controls.clientId.setValue(clientId);
        }

        this.loadClients();

        this.loadSavingsProducts();

    }

    /**
     * Load all clients for Client dropdown.
     */
    loadClients(): void {

        this.loadingClients = true;

        this.http.get<Client[]>(
            this.clientsApiUrl,
            {
                headers: this.getAuthHeaders()
            }
        ).subscribe({

            next: (clients) => {

                console.log(
                    'Clients:',
                    clients
                );

                this.clients = clients || [];
                const selectedClientId = this.accountForm.controls.clientId.value;
                if (selectedClientId !== null && !this.clients.some(client => client.id === selectedClientId)) {
                    this.accountForm.controls.clientId.setValue(null);
                    this.errorMessage = 'The client selected from the portfolio could not be found.';
                }

                this.loadingClients = false;

            },

            error: (error) => {

                console.error(
                    'Failed to load clients:',
                    error
                );

                this.errorMessage =
                    error?.error?.message ||
                    'Unable to load clients. Please try again.';

                this.loadingClients = false;

            }

        });

    }

    /**
     * Load all savings products for Product dropdown.
     */
    loadSavingsProducts(): void {

        this.loadingProducts = true;

        this.http.get<SavingsProduct[]>(
            this.productsApiUrl,
            {
                headers: this.getAuthHeaders()
            }
        ).subscribe({

            next: (products) => {

                console.log(
                    'Savings Products:',
                    products
                );

                this.savingsProducts =
                    products || [];

                this.loadingProducts = false;

            },

            error: (error) => {

                console.error(
                    'Failed to load savings products:',
                    error
                );

                this.errorMessage =
                    error?.error?.message ||
                    'Unable to load savings products. Please try again.';

                this.loadingProducts = false;

            }

        });

    }

    save(): void {

        if (this.accountForm.invalid) {

            this.accountForm.markAllAsTouched();

            return;

        }

        this.loading = true;

        this.errorMessage = '';

        const request = {

            clientId:
                this.accountForm.value.clientId,

            productId:
                this.accountForm.value.productId,

            accountNo:
                this.accountForm.value.accountNo?.trim()

        };

        console.log(
            'Create Savings Account:',
            request
        );

        this.http.post(
            this.apiUrl,
            request,
            {
                headers: this.getAuthHeaders()
            }
        ).subscribe({

            next: () => {

                this.loading = false;

                this.returnToClientOrAccountList();

            },

            error: (error) => {

                console.error(
                    'Failed to create savings account:',
                    error
                );

                this.errorMessage =
                    error?.error?.message ||
                    'Unable to create savings account. Please try again.';

                this.loading = false;

            }

        });

    }

    cancel(): void {
        this.returnToClientOrAccountList();
    }

    private returnToClientOrAccountList(): void {
        const clientId = Number(this.route.snapshot.queryParamMap.get('clientId'));
        if (Number.isSafeInteger(clientId) && clientId > 0) {
            this.router.navigate(['/clients', clientId, 'edit']);
            return;
        }
        this.router.navigate(['/savingsaccounts']);
    }

    /**
     * Display client name in dropdown.
     */
    getClientName(client: Client): string {

        const firstName =
            client.firstName || '';


        const lastName =
            client.lastName || '';

        return [
            firstName,
            lastName
        ]
            .filter(name => name.trim().length > 0)
            .join(' ');
    }
    /**
     * Get selected client.
     */
    getSelectedClient(): Client | undefined {

        const clientId =
            this.accountForm.value.clientId;

        if (clientId === null) {
            return undefined;
        }

        return this.clients.find(
            client =>
                Number(client.id) === Number(clientId)
        );

    }

    /**
     * Get selected savings product.
     */
    getSelectedProduct(): SavingsProduct | undefined {

        const productId =
            this.accountForm.value.productId;

        if (productId === null) {
            return undefined;
        }

        return this.savingsProducts.find(
            product =>
                Number(product.id) === Number(productId)
        );

    }

    private getAuthHeaders(): HttpHeaders {

        const authHeader =
            localStorage.getItem('authHeader');

        return authHeader
            ? new HttpHeaders({
                Authorization: authHeader
            })
            : new HttpHeaders();

    }

}