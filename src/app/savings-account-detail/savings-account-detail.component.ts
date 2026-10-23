import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface SavingsAccount {
  id: number;
  clientId: number;
  productId: number;
  accountNo: string;
  status: string;
  balance: number;
  heldAmount?: number;
  availableBalance?: number;
  nominalAnnualInterestRate?: number;
  createdOn: string;
  activatedOn?: string;
}

interface SavingsAccountClosePreview {
  accountId: number;
  canClose: boolean;
  status: string;
  balance: number;
  availableBalance: number;
  closureFeeAmount: number;
  residualAmount: number;
  closureFeeAlreadyCharged: boolean;
  requiresMakerChecker: boolean;
  blockers: string[];
  warnings: string[];
  destinationAccounts: SavingsAccount[];
}

interface SavingsAccountClosureResult {
  status: 'CLOSED' | 'PENDING_APPROVAL';
  account: SavingsAccount;
  pendingRequestId: number | null;
  closureFeeAmount: number;
  residualTransferAmount: number;
}

interface PendingMakerCheckerRequest {
  id: number;
  savingsAccountId: number;
  commandType: string;
  status: 'PENDING';
}

interface SavingsInterestPreviewData {
  accountId: number;
  currentBalance: number;
  averageDailyBalance: number;
  annualRate: number;
  fromDate: string;
  toDate: string;
  days: number;
  amount: number;
  method: string;
}

interface SavingsTransaction {
  id: number;
  accountId: number;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  runningBalance: number;
  reversed: boolean;
  reversalOfTransactionId: number | null;
  transferGroupId: string | null;
  createdOn: string;
}

interface SavingsHold {
  id: number;
  accountId: number;
  amount: number;
  reason: string | null;
  status: string;
  createdOn: string;
  releasedOn?: string | null;
}

interface SavingsAccountAudit {
  id: number;
  savingsAccountId: number;
  eventType: string;
  summary: string;
  amount: number | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  performedBy: string;
  performedOn: string;
}

interface SavingsAccountNote {
  id: number;
  savingsAccountId: number;
  body: string;
  createdBy: string;
  createdOn: string;
}

interface SavingsStandingInstruction {
  id: number;
  fromAccountId: number;
  fromAccountNo: string;
  toAccountId: number;
  toAccountNo: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  validFrom: string;
  validTo: string | null;
  nextDueDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  createdBy: string;
  createdOn: string;
}

interface SavingsStandingInstructionRun {
  id: number;
  instructionId: number;
  dueDate: string;
  status: 'SUCCESS' | 'PENDING_APPROVAL' | 'SKIPPED' | 'FAILED';
  reason: string | null;
  pendingRequestId: number | null;
  processedOn: string;
}

interface SavingsStandingInstructionBatch {
  businessDate: string;
  processed: number;
  success: number;
  pendingApproval: number;
  skipped: number;
  failed: number;
  runs: SavingsStandingInstructionRun[];
}

@Component({
  selector: 'app-savings-account-detail',
  standalone: false,
  templateUrl: './savings-account-detail.component.html',
  styleUrls: ['./savings-account-detail.component.scss']
})
export class SavingsAccountDetailComponent implements OnInit {

  account: SavingsAccount | null = null;
  closurePreview: SavingsAccountClosePreview | null = null;
  selectedClosureDestinationAccountId: number | null = null;
  closurePreviewLoading = false;
  closureErrorMessage = '';
  closureSuccessMessage = '';

  transactions: SavingsTransaction[] = [];
  transactionHistoryExpanded = true;
  auditHistoryExpanded = true;

  clientName = '';
  productName = '';
  productMinRequiredBalance: number | null = null;
  productWithdrawalFeeAmount: number | null = null;
  productCurrencyCode = '';

  loading = true;
  processing = false;

  errorMessage = '';
  successMessage = '';
  pendingApprovalId: number | null = null;
  withdrawErrorMessage = '';
  undoErrorMessage = '';

  /*
   * Freeze / Unfreeze
   */
  freezeMessage = '';
  freezeMessageType: 'success' | 'error' = 'success';

  /*
   * Hold
   */
  holdAmount: number | null = null;
  holdReason = '';

  holdsLoading = false;

  holds: SavingsHold[] = [];

  holdErrorMessage = '';
  holdSuccessMessage = '';

  /*
   * Audit History
   */
  audits: SavingsAccountAudit[] = [];
  auditsLoading = false;
  auditErrorMessage = '';

  /*
   * Account Notes
   */
  notes: SavingsAccountNote[] = [];
  notesLoading = false;
  noteBody = '';
  noteErrorMessage = '';
  noteSuccessMessage = '';
  addingNote = false;

  /*
   * Available balance.
   *
   * Example:
   *
   * Balance       = 1000
   * Held amount   = 200
   * Available     = 800
   */
  get availableBalance(): number {

    const balance = this.account?.balance ?? 0;

    const heldAmount =
      this.account?.heldAmount ?? 0;

    return Math.max(
      0,
      Number(balance) - Number(heldAmount)
    );
  }

  depositAmount: number | null = null;
  withdrawAmount: number | null = null;

  /*
   * Interest
   */
  interestFromDate = '';
  interestToDate = '';
  interestPreviewData: SavingsInterestPreviewData | null = null;
  interestPreviewLoading = false;
  interestPosting = false;
  interestErrorMessage = '';

  /*
   * Transfer
   */
  transferAmount: number | null = null;

  transferAccounts: SavingsAccount[] = [];

  selectedDestinationAccountId: number | null = null;

  transferErrorMessage = '';
  transferSuccessMessage = '';

  standingInstructions: SavingsStandingInstruction[] = [];
  standingInstructionHistories: { [instructionId: number]: SavingsStandingInstructionRun[] } = {};
  standingInstructionToAccountId: number | null = null;
  standingInstructionAmount: number | null = null;
  standingInstructionFrequency: SavingsStandingInstruction['frequency'] = 'MONTHLY';
  standingInstructionValidFrom = this.localDateToday();
  standingInstructionValidTo = '';
  standingInstructionNextDueDate = this.localDateToday();
  standingInstructionsLoading = false;
  standingInstructionProcessing = false;
  standingInstructionErrorMessage = '';
  standingInstructionSuccessMessage = '';
  standingInstructionBatch: SavingsStandingInstructionBatch | null = null;

  /*
   * Statement date filter
   */
  fromDate = '';
  toDate = '';

  filteredTransactions: SavingsTransaction[] = [];

  /*
   * Transfer counterpart account numbers
   */
  transactionCounterpartAccountNos: {
    [transactionId: number]: string
  } = {};

  private apiBase = '/mini-fineract-provider/api/v1';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {

      const accountId = Number(id);

      this.loadAccount(accountId);
      this.loadTransactions(accountId);

    } else {

      this.loading = false;

      this.errorMessage =
        'Savings account ID is missing.';
    }
  }

  /**
   * Load savings account.
   */
  loadAccount(id: number): void {

    this.loading = true;

    this.http.get<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${id}`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.loading = false;
        this.refreshClosurePreview(data.id);

        /*
         * Load Audit History.
         */
        this.loadAudits(data.id);

        /*
         * Load Account Notes.
         */
        this.loadNotes(data.id);

        if (this.transactions.length > 0) {

          this.loadTransferCounterparts(
            this.transactions
          );
        }

        this.loadClientName(data.clientId);

        this.loadProductDetails(data.productId);

        /*
         * Load ACTIVE accounts belonging to
         * the same client.
         */
        this.loadTransferAccounts(data);

        this.loadStandingInstructions(data.id);

        /*
         * Load account holds.
         */
        this.loadHolds();
      },

      error: (error) => {

        console.error(
          'Unable to load savings account:',
          error
        );

        this.errorMessage =
          error?.error?.message ||
          'Unable to load savings account.';

        this.loading = false;
      }
    });
  }

  /**
   * Load client name.
   */
  loadClientName(clientId: number): void {

    this.http.get<any>(
      `${this.apiBase}/clients/${clientId}`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (client) => {

        console.log(
          'CLIENT RESPONSE:',
          client
        );

        const firstName =
          client.firstname ||
          client.firstName ||
          '';

        const lastName =
          client.lastname ||
          client.lastName ||
          '';

        this.clientName =
          client.displayName ||
          `${firstName} ${lastName}`.trim();

        if (!this.clientName) {

          this.clientName =
            `Client #${clientId}`;
        }
      },

      error: (error) => {

        console.error(
          'Client API error:',
          error
        );

        this.clientName =
          `Client #${clientId}`;
      }
    });
  }

  /**
   * Load savings product name.
   */
  loadProductDetails(productId: number): void {

    this.http.get<{
      name?: string;
      minRequiredBalance?: number | null;
      withdrawalFeeAmount?: number | null;
      currencyCode?: string;
    }>(
      `${this.apiBase}/savingsproducts/${productId}`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (product) => {

        this.productName =
          product.name ||
          `Product #${productId}`;
        this.productMinRequiredBalance =
          product.minRequiredBalance ?? null;
        this.productWithdrawalFeeAmount =
          product.withdrawalFeeAmount ?? null;
        this.productCurrencyCode =
          product.currencyCode || '';
      },

      error: (error) => {

        console.error(
          'Unable to load product name.',
          error
        );

        this.productName =
          `Product #${productId}`;
      }
    });
  }

  /**
   * Load transaction history.
   *
   * If fromDate/toDate are provided,
   * the backend performs the date filtering.
   */
  loadTransactions(
    id: number,
    useDateFilter: boolean = false
  ): void {

    let url =
      `${this.apiBase}/savingsaccounts/${id}/transactions`;

    if (
      useDateFilter &&
      (this.fromDate || this.toDate)
    ) {

      const params: string[] = [];

      if (this.fromDate) {

        params.push(
          `fromDate=${encodeURIComponent(this.fromDate)}`
        );
      }

      if (this.toDate) {

        params.push(
          `toDate=${encodeURIComponent(this.toDate)}`
        );
      }

      if (params.length > 0) {

        url += `?${params.join('&')}`;
      }
    }

    this.http.get<SavingsTransaction[]>(
      url,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        if (!useDateFilter) {
          this.transactions = data;
        }

        this.filteredTransactions = data;

        if (this.account) {

          this.loadTransferCounterparts(data);
        }
      },

      error: (error) => {

        console.error(
          'Unable to load transactions.',
          error
        );

        this.errorMessage =
          error?.error?.message ||
          'Unable to load transactions.';
      }
    });
  }

  /**
   * Preview interest for the selected date range.
   */
  clearInterestPreview(): void {
    this.interestPreviewData = null;
    this.interestErrorMessage = '';
  }

  previewInterest(): void {

    if (!this.account) {
      return;
    }

    this.interestPreviewData = null;
    this.clearMessages();
    this.interestErrorMessage = '';

    if (this.account.status !== 'ACTIVE') {
      this.interestErrorMessage =
        'Interest preview is only available for ACTIVE savings accounts.';
      return;
    }

    if (!this.interestFromDate || !this.interestToDate) {
      this.interestErrorMessage =
        'Please select both a start date and an end date.';
      return;
    }

    if (this.interestFromDate > this.interestToDate) {
      this.interestErrorMessage =
        'From date cannot be later than to date.';
      return;
    }

    this.interestPreviewLoading = true;

    const params = new URLSearchParams({
      fromDate: this.interestFromDate,
      toDate: this.interestToDate
    });

    this.http.get<SavingsInterestPreviewData>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/interest/preview?${params.toString()}`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({
      next: (data) => {
        this.interestPreviewData = data;
        this.interestPreviewLoading = false;
      },
      error: (error) => {
        console.error('Unable to preview interest:', error);
        this.interestPreviewData = null;
        this.interestErrorMessage =
          error?.error?.message ||
          'Unable to preview interest.';
        this.interestPreviewLoading = false;
      }
    });
  }

  /**
   * Post calculated interest for the selected date range.
   */
  postInterest(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages(false);
    this.interestErrorMessage = '';

    if (this.account.status !== 'ACTIVE') {
      this.interestErrorMessage =
        'Interest posting is only available for ACTIVE savings accounts.';
      return;
    }

    if (!this.interestFromDate || !this.interestToDate) {
      this.interestErrorMessage =
        'Please select both a start date and an end date.';
      return;
    }

    if (this.interestFromDate > this.interestToDate) {
      this.interestErrorMessage =
        'From date cannot be later than to date.';
      return;
    }

    const preview = this.interestPreviewData;

    if (
      !preview ||
      preview.fromDate !== this.interestFromDate ||
      preview.toDate !== this.interestToDate ||
      preview.amount <= 0
    ) {
      this.interestErrorMessage =
        'Generate a current preview for the selected dates before posting interest.';
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to post interest of ${preview.amount.toFixed(2)} for the selected date range?`
    );

    if (!confirmed) {
      return;
    }

    this.interestPosting = true;

    this.http.post<SavingsAccount | PendingMakerCheckerRequest>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/interest`,
      {
        fromDate: this.interestFromDate,
        toDate: this.interestToDate
      },
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({
      next: (data) => {
        if (this.isPendingMakerCheckerRequest(data)) {
          this.pendingApprovalId = data.id;
          this.successMessage = `Submitted for checker approval (pending #${data.id}).`;
          this.interestPreviewData = null;
          this.interestFromDate = '';
          this.interestToDate = '';
          this.interestPosting = false;
          this.loadAudits(this.account!.id);
          return;
        }
        this.account = data;
        this.pendingApprovalId = null;
        this.interestPreviewData = null;
        this.interestFromDate = '';
        this.interestToDate = '';
        this.successMessage =
          'Interest posted successfully.';
        this.interestPosting = false;
        this.loadTransferAccounts(data);
        this.loadHolds();
        this.loadTransactions(data.id);
        this.loadAudits(data.id);
      },
      error: (error) => {
        console.error('Unable to post interest:', error);
        this.interestErrorMessage =
          error?.error?.message ||
          'Unable to post interest.';
        this.interestPosting = false;
      }
    });
  }

  /**
   * Load ACTIVE savings accounts belonging
   * to the same client.
   *
   * The current account is excluded.
   *
   * We intentionally load all savings accounts
   * first and filter them on the frontend.
   */
  private loadTransferAccounts(
    currentAccount: SavingsAccount
  ): void {

    this.transferAccounts = [];

    this.http.get<SavingsAccount[]>(
      `${this.apiBase}/savingsaccounts`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (accounts) => {

        console.log(
          'ALL SAVINGS ACCOUNTS:',
          accounts
        );

        this.transferAccounts =
          accounts.filter(account =>

            Number(account.clientId) ===
            Number(currentAccount.clientId)

            &&

            account.status === 'ACTIVE'

            &&

            Number(account.id) !==
            Number(currentAccount.id)

          );

        console.log(
          'TRANSFER ACCOUNTS:',
          this.transferAccounts
        );

        this.transferAccounts.forEach(
          account => {

            console.log(
              'Transfer Account:',
              'ID =',
              account.id,
              'Account No =',
              account.accountNo,
              'Client ID =',
              account.clientId,
              'Status =',
              account.status,
              'Balance =',
              account.balance
            );
          }
        );
      },

      error: (error) => {

        console.error(
          'Failed to load transfer accounts:',
          error
        );

        this.transferAccounts = [];

        this.transferErrorMessage =
          error?.error?.message ||
          'Unable to load destination accounts.';
      }
    });
  }

  private loadStandingInstructions(accountId: number): void {
    this.standingInstructionsLoading = true;
    this.standingInstructionErrorMessage = '';
    this.http.get<SavingsStandingInstruction[]>(
      `${this.apiBase}/savingsaccounts/${accountId}/standing-instructions`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (instructions) => {
        this.standingInstructions = instructions || [];
        this.standingInstructionHistories = {};
        this.standingInstructionsLoading = false;
        this.standingInstructions.forEach(instruction =>
          this.loadStandingInstructionHistory(instruction.id)
        );
      },
      error: (error) => {
        console.error('Unable to load standing instructions:', error);
        this.standingInstructionErrorMessage =
          error?.error?.message || 'Unable to load standing instructions.';
        this.standingInstructionsLoading = false;
      }
    });
  }

  private loadStandingInstructionHistory(instructionId: number): void {
    this.http.get<SavingsStandingInstructionRun[]>(
      `${this.apiBase}/standing-instructions/${instructionId}/history`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (history) => {
        this.standingInstructionHistories[instructionId] = history || [];
      },
      error: (error) => {
        console.error(`Unable to load standing-instruction history #${instructionId}:`, error);
        this.standingInstructionErrorMessage =
          error?.error?.message || 'Unable to load standing-instruction history.';
      }
    });
  }

  createStandingInstruction(): void {
    if (!this.account || this.account.status !== 'ACTIVE') {
      this.standingInstructionErrorMessage = 'Standing instructions require an ACTIVE source account.';
      return;
    }
    if (!this.standingInstructionToAccountId) {
      this.standingInstructionErrorMessage = 'Select a destination account.';
      return;
    }
    if (!this.standingInstructionAmount || this.standingInstructionAmount <= 0) {
      this.standingInstructionErrorMessage = 'Amount must be greater than zero.';
      return;
    }
    if (!this.standingInstructionValidFrom) {
      this.standingInstructionErrorMessage = 'Valid-from date is required.';
      return;
    }
    if (!this.standingInstructionNextDueDate) {
      this.standingInstructionErrorMessage = 'Next-due date is required.';
      return;
    }
    if (this.standingInstructionNextDueDate < this.standingInstructionValidFrom) {
      this.standingInstructionErrorMessage = 'Next-due date must be on or after valid-from date.';
      return;
    }
    if (this.standingInstructionValidTo
      && this.standingInstructionValidTo < this.standingInstructionValidFrom) {
      this.standingInstructionErrorMessage = 'Valid-to date must be on or after valid-from date.';
      return;
    }
    if (this.standingInstructionValidTo
      && this.standingInstructionNextDueDate > this.standingInstructionValidTo) {
      this.standingInstructionErrorMessage = 'Next-due date must be on or before valid-to date.';
      return;
    }

    this.standingInstructionProcessing = true;
    this.standingInstructionErrorMessage = '';
    this.standingInstructionSuccessMessage = '';
    this.http.post<SavingsStandingInstruction>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/standing-instructions`,
      {
        toAccountId: this.standingInstructionToAccountId,
        amount: this.standingInstructionAmount,
        frequency: this.standingInstructionFrequency,
        validFrom: this.standingInstructionValidFrom,
        validTo: this.standingInstructionValidTo || null,
        nextDueDate: this.standingInstructionNextDueDate
      },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.standingInstructionAmount = null;
        this.standingInstructionToAccountId = null;
        this.standingInstructionValidTo = '';
        this.standingInstructionValidFrom = this.localDateToday();
        this.standingInstructionNextDueDate = this.localDateToday();
        this.standingInstructionSuccessMessage = 'Standing instruction created and activated.';
        this.standingInstructionProcessing = false;
        this.loadStandingInstructions(this.account!.id);
        this.loadAudits(this.account!.id);
      },
      error: (error) => {
        console.error('Unable to create standing instruction:', error);
        this.standingInstructionErrorMessage =
          error?.error?.message || 'Unable to create standing instruction.';
        this.standingInstructionProcessing = false;
      }
    });
  }

  standingInstructionAction(
    instruction: SavingsStandingInstruction,
    action: 'pause' | 'resume' | 'cancel'
  ): void {
    const actionLabel = action === 'pause'
      ? 'paused'
      : action === 'resume'
        ? 'resumed'
        : 'cancelled';
    if (action === 'cancel'
      && !confirm(`Cancel standing instruction #${instruction.id}?`)) {
      return;
    }
    this.standingInstructionProcessing = true;
    this.standingInstructionErrorMessage = '';
    this.standingInstructionSuccessMessage = '';
    this.http.post<SavingsStandingInstruction>(
      `${this.apiBase}/standing-instructions/${instruction.id}/${action}`,
      {},
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.standingInstructionSuccessMessage =
          `Standing instruction #${instruction.id} ${actionLabel}d.`;
        this.standingInstructionProcessing = false;
        this.loadStandingInstructions(this.account!.id);
        this.loadAudits(this.account!.id);
      },
      error: (error) => {
        console.error(`Unable to ${action} standing instruction:`, error);
        this.standingInstructionErrorMessage =
          error?.error?.message || `Unable to ${action} standing instruction.`;
        this.standingInstructionProcessing = false;
      }
    });
  }

  runDueStandingInstructions(): void {
    if (!confirm(`Run active standing instructions due on ${this.localDateToday()}?`)) {
      return;
    }
    this.standingInstructionProcessing = true;
    this.standingInstructionErrorMessage = '';
    this.standingInstructionSuccessMessage = '';
    const businessDate = this.localDateToday();
    this.http.post<SavingsStandingInstructionBatch>(
      `${this.apiBase}/standing-instructions/run-due?businessDate=${businessDate}`,
      {},
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (batch) => {
        this.standingInstructionBatch = batch;
        const pending = batch.pendingApproval
          ? `, pending approval ${batch.pendingApproval}`
          : '';
        this.standingInstructionSuccessMessage =
          `Run for ${batch.businessDate}: ${batch.processed} processed, `
          + `${batch.success} successful${pending}, ${batch.skipped} skipped, ${batch.failed} failed.`;
        const pendingRun = batch.runs.find(run => run.pendingRequestId !== null);
        this.pendingApprovalId = pendingRun?.pendingRequestId || null;
        this.standingInstructionProcessing = false;
        this.loadAccount(this.account!.id);
        this.loadTransactions(this.account!.id);
        this.loadStandingInstructions(this.account!.id);
        this.loadAudits(this.account!.id);
      },
      error: (error) => {
        console.error('Unable to run due standing instructions:', error);
        this.standingInstructionErrorMessage =
          error?.error?.message || 'Unable to run due standing instructions.';
        this.standingInstructionProcessing = false;
      }
    });
  }

  private localDateToday(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  /**
   * Find the paired account for each transfer
   * using its shared transfer group.
   */
  loadTransferCounterparts(
    transactions: SavingsTransaction[]
  ): void {

    if (!this.account) {
      return;
    }

    const transferTransactions =
      transactions.filter(
        transaction =>

          (
            transaction.transactionType ===
            'TRANSFER_OUT'

            ||

            transaction.transactionType ===
            'TRANSFER_IN'
          )

          &&

          transaction.transferGroupId
      );

    if (transferTransactions.length === 0) {

      this.transactionCounterpartAccountNos = {};

      return;
    }

    const currentAccount =
      this.account;

    this.http.get<SavingsAccount[]>(
      `${this.apiBase}/savingsaccounts?clientId=${currentAccount.clientId}`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (accounts) => {

        const counterpartAccounts =
          accounts.filter(
            account =>

              account.id !==
              currentAccount.id

              &&

              account.clientId ===
              currentAccount.clientId
          );

        if (counterpartAccounts.length === 0) {

          this.transactionCounterpartAccountNos = {};

          return;
        }

        const counterpartAccountNos: {
          [transactionId: number]: string
        } = {};

        let completedLookups = 0;

        const finishLookup = () => {

          completedLookups += 1;

          if (
            completedLookups ===
            counterpartAccounts.length
          ) {

            this.transactionCounterpartAccountNos =
              counterpartAccountNos;
          }
        };

        counterpartAccounts.forEach(
          counterpartAccount => {

            this.http.get<SavingsTransaction[]>(
              `${this.apiBase}/savingsaccounts/${counterpartAccount.id}/transactions`,
              {
                headers:
                  this.getAuthHeaders()
              }
            ).subscribe({

              next: (
                counterpartTransactions
              ) => {

                transferTransactions.forEach(
                  transaction => {

                    const pairedType =
                      transaction.transactionType ===
                        'TRANSFER_OUT'

                        ?

                        'TRANSFER_IN'

                        :

                        'TRANSFER_OUT';

                    const pairedTransaction =
                      counterpartTransactions.find(
                        counterpartTransaction =>

                          counterpartTransaction
                            .transferGroupId ===
                          transaction
                            .transferGroupId

                          &&

                          counterpartTransaction
                            .transactionType ===
                          pairedType
                      );

                    if (
                      pairedTransaction
                    ) {

                      counterpartAccountNos[
                        transaction.id
                      ] =
                        counterpartAccount.accountNo;
                    }
                  }
                );

                finishLookup();
              },

              error: () => {

                finishLookup();
              }
            });
          }
        );
      },

      error: (error) => {

        console.error(
          'Unable to load transfer counterpart accounts.',
          error
        );

        this.transactionCounterpartAccountNos =
          {};
      }
    });
  }

  /**
   * Display transaction type.
   */
  getTransactionTypeLabel(
    transaction: SavingsTransaction
  ): string {

    const counterpartAccountNo =
      this.transactionCounterpartAccountNos[
      transaction.id
      ];

    if (
      transaction.transactionType ===
      'TRANSFER_OUT'
    ) {

      return `CASH OUT (To: ${counterpartAccountNo ||
        'account unavailable'
        })`;
    }

    if (
      transaction.transactionType ===
      'TRANSFER_IN'
    ) {

      return `CASH IN (From: ${counterpartAccountNo ||
        'account unavailable'
        })`;
    }

    return transaction.transactionType;
  }

  /**
   * Transfer money to another savings account.
   */
  transfer(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    this.transferErrorMessage = '';

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.transferErrorMessage =
        'Transfer is only allowed for ACTIVE savings accounts.';

      return;
    }

    if (
      this.selectedDestinationAccountId ===
      null

      ||

      this.selectedDestinationAccountId ===
      undefined
    ) {

      this.transferErrorMessage =
        'Please select a destination account.';

      return;
    }

    if (
      this.selectedDestinationAccountId ===
      this.account.id
    ) {

      this.transferErrorMessage =
        'Source and destination accounts must be different.';

      return;
    }

    if (
      this.transferAmount === null

      ||

      this.transferAmount ===
      undefined
    ) {

      this.transferErrorMessage =
        'Please enter a transfer amount.';

      return;
    }

    if (
      this.transferAmount <= 0
    ) {

      this.transferErrorMessage =
        'Transfer amount must be greater than zero.';

      return;
    }

    /*
     * Transfer cannot exceed available balance.
     *
     * Available balance =
     * balance - held amount.
     */
    if (
      this.transferAmount >
      this.availableBalance
    ) {

      this.transferErrorMessage =
        'Transfer amount cannot exceed available balance.';

      return;
    }

    const destination =
      this.transferAccounts.find(
        account =>

          account.id ===
          this.selectedDestinationAccountId
      );

    if (!destination) {

      this.transferErrorMessage =
        'Invalid destination account.';

      return;
    }

    const confirmed = confirm(
      `Are you sure you want to transfer ${this.transferAmount} from account ${this.account.accountNo} to account ${destination.accountNo}?`
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;

    this.http.post<SavingsAccount | PendingMakerCheckerRequest>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/transfer`,
      {
        toAccountId:
          this.selectedDestinationAccountId,

        amount:
          this.transferAmount
      },
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {
        if (this.isPendingMakerCheckerRequest(data)) {
          this.pendingApprovalId = data.id;
          this.transferAmount = null;
          this.selectedDestinationAccountId = null;
          this.transferSuccessMessage = `Submitted for checker approval (pending #${data.id}).`;
          this.processing = false;
          this.loadAudits(this.account!.id);
          return;
        }
        this.account = data;
        this.pendingApprovalId = null;

        this.transferAmount = null;

        this.selectedDestinationAccountId =
          null;

        this.transferSuccessMessage =
          'Transfer completed successfully.';

        this.processing = false;

        this.loadAccount(data.id);

        this.loadTransactions(data.id);

        this.loadAudits(data.id);
      },

      error: (error) => {

        console.error(
          'Unable to complete transfer:',
          error
        );

        this.transferErrorMessage =
          error?.error?.message ||
          'Unable to complete transfer.';

        this.processing = false;
      }
    });
  }

  /**
   * Undo a specific transaction.
   */
  /**
   * Undo a specific transaction.
   */
  undoTransaction(
    transaction: SavingsTransaction
  ): void {

    if (!this.account) {
      return;
    }

    /*
     * Keep the undo result as the only visible operation message.
     */
    this.undoErrorMessage = '';
    this.successMessage = '';
    this.transferErrorMessage = '';
    this.transferSuccessMessage = '';

    const accountId =
      this.account.id;

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.undoErrorMessage =
        'Only ACTIVE savings accounts can undo transactions.';

      return;
    }

    if (transaction.reversed) {

      this.undoErrorMessage =
        'This transaction has already been reversed.';

      return;
    }

    if (
      transaction.reversalOfTransactionId !== null
    ) {

      this.undoErrorMessage =
        'A reversal transaction cannot be undone.';

      return;
    }

    const isInterest =
      transaction.transactionType === 'INTEREST';

    const isNormalTransaction =
      transaction.transactionType === 'DEPOSIT'
      ||
      transaction.transactionType === 'WITHDRAW'
      ||
      transaction.transactionType === 'FEE';

    const isTransfer =
      transaction.transactionType === 'TRANSFER_OUT'
      ||
      transaction.transactionType === 'TRANSFER_IN';

    if (
      !isNormalTransaction &&
      !isInterest &&
      !isTransfer
    ) {

      this.undoErrorMessage =
        'This transaction type cannot be undone.';

      return;
    }

    if (!this.canUndo(transaction)) {
      this.undoErrorMessage =
        'Only the latest transaction can be undone.';

      return;
    }

    const confirmationMessage = isInterest
      ? `Are you sure you want to undo this interest posting of ${transaction.amount}?`
      : `Are you sure you want to undo this ${transaction.transactionType.toLowerCase()} of ${transaction.amount}?`;

    const confirmed = confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    this.processing = true;

    const url =
      `${this.apiBase}/savingsaccounts/` +
      `${accountId}/transactions/` +
      `${transaction.id}/undo`;

    this.http.post<SavingsAccount>(
      url,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {
        this.account = data;

        if (isTransfer) {

          this.successMessage =
            'Transfer undone successfully.';

        } else if (isInterest) {

          this.successMessage =
            'Interest posting undone successfully.';

        } else {

          this.successMessage =
            'Transaction undone successfully.';
        }

        this.undoErrorMessage = '';

        this.processing = false;

        this.loadAccount(accountId);

        this.loadTransactions(accountId);
      },

      error: (error) => {

        console.error(
          'Unable to undo transaction:',
          error
        );

        /*
         * Backend IllegalArgumentException message.
         *
         * Example:
         * Cannot undo transfer because the current
         * source account balance is below the minimum
         * required balance of 1000 MMK.
         */
        const backendMessage =
          error?.error?.message;

        if (
          backendMessage &&
          typeof backendMessage === 'string'
        ) {

          this.undoErrorMessage =
            backendMessage;

        } else if (
          error?.message &&
          typeof error.message === 'string'
        ) {

          this.undoErrorMessage =
            error.message;

        } else {

          this.undoErrorMessage =
            'Unable to undo transaction.';
        }

        this.successMessage = '';

        this.processing = false;
      }
    });
  }

  /**
   * Check whether a transaction can be undone.
   */
  canUndo(
    transaction: SavingsTransaction
  ): boolean {

    if (!this.account) {
      return false;
    }

    if (
      this.account.status !== 'ACTIVE'
    ) {

      return false;
    }

    if (transaction.reversed) {
      return false;
    }

    if (
      transaction.reversalOfTransactionId !==
      null
    ) {

      return false;
    }

    const supported =
      transaction.transactionType ===
      'DEPOSIT'

      ||

      transaction.transactionType ===
      'WITHDRAW'

      ||

      transaction.transactionType ===
      'FEE'

      ||

      transaction.transactionType ===
      'TRANSFER_OUT'

      ||

      transaction.transactionType ===
      'TRANSFER_IN';

    const supportedInterest =
      transaction.transactionType === 'INTEREST';

    if (!supported && !supportedInterest) {
      return false;
    }

    const latestTransaction =
      this.transactions
        .reduce<SavingsTransaction | null>(
          (latest, transactionItem) =>
            latest === null || transactionItem.id > latest.id
              ? transactionItem
              : latest,
          null
        );

    return (
      latestTransaction?.id ===
      transaction.id
    );
  }

  /**
   * SUBMITTED -> APPROVED.
   */
  approve(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    this.processing = true;

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/approve`,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.successMessage =
          'Savings account approved successfully.';

        this.processing = false;

        this.loadTransferAccounts(data);

        this.loadAudits(data.id);
      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to approve savings account.';

        this.processing = false;
      }
    });
  }

  /**
   * APPROVED -> ACTIVE.
   */
  activate(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    this.processing = true;

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/activate`,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.successMessage =
          'Savings account activated successfully.';

        this.processing = false;

        this.loadTransferAccounts(data);

        this.loadHolds();

        this.loadAudits(data.id);
      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to activate savings account.';

        this.processing = false;
      }
    });
  }

  /**
   * ACTIVE -> FROZEN.
   */
  freezeAccount(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.freezeMessage =
        'Only ACTIVE savings accounts can be frozen.';

      this.freezeMessageType = 'error';

      return;
    }

    const confirmed = confirm(
      'Are you sure you want to freeze this savings account?'
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/freeze`,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.freezeMessage =
          'Savings account frozen successfully.';

        this.freezeMessageType = 'success';

        this.processing = false;

        this.transferAccounts = [];

        this.selectedDestinationAccountId =
          null;

        this.loadAudits(data.id);
      },

      error: (error) => {

        console.error(
          'Unable to freeze savings account:',
          error
        );

        this.freezeMessage =
          error?.error?.message ||
          'Unable to freeze savings account.';

        this.freezeMessageType = 'error';

        this.processing = false;
      }
    });
  }

  /**
   * FROZEN -> ACTIVE.
   */
  unfreezeAccount(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    if (
      this.account.status !== 'FROZEN'
    ) {

      this.freezeMessage =
        'Only FROZEN savings accounts can be unfrozen.';

      this.freezeMessageType = 'error';

      return;
    }

    const confirmed = confirm(
      'Are you sure you want to unfreeze this savings account?'
    );

    if (!confirmed) {
      return;
    }

    this.processing = true;

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/unfreeze`,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.freezeMessage =
          'Savings account unfrozen successfully.';

        this.freezeMessageType = 'success';

        this.processing = false;

        this.loadTransferAccounts(data);

        this.loadAudits(data.id);
      },

      error: (error) => {

        console.error(
          'Unable to unfreeze savings account:',
          error
        );

        this.freezeMessage =
          error?.error?.message ||
          'Unable to unfreeze savings account.';

        this.freezeMessageType = 'error';

        this.processing = false;
      }
    });
  }

  /**
   * ACTIVE -> Deposit.
   */
  deposit(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.errorMessage =
        'Deposit is only allowed for ACTIVE savings accounts.';

      return;
    }

    if (
      this.depositAmount === null

      ||

      this.depositAmount ===
      undefined
    ) {

      this.errorMessage =
        'Please enter a deposit amount.';

      return;
    }

    if (
      this.depositAmount <= 0
    ) {

      this.errorMessage =
        'Deposit amount must be greater than zero.';

      return;
    }

    this.processing = true;

    this.http.post<SavingsAccount>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/deposit`,
      {
        amount:
          this.depositAmount
      },
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.account = data;

        this.depositAmount = null;

        this.successMessage =
          'Deposit completed successfully.';

        this.processing = false;

        const accountId =
          data.id;

        this.loadTransactions(accountId);

        this.loadTransferAccounts(data);

        this.loadHolds();

        this.loadAudits(accountId);
      },

      error: (error) => {

        console.error(error);

        this.errorMessage =
          error?.error?.message ||
          'Unable to complete deposit.';

        this.processing = false;
      }
    });
  }

  /**
   * Filter transactions by date.
   */
  filterTransactions(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    if (
      this.fromDate &&
      this.toDate &&
      this.fromDate > this.toDate
    ) {

      this.errorMessage =
        'From date cannot be later than to date.';

      return;
    }

    this.loadTransactions(
      this.account.id,
      true
    );
  }

  /**
   * Clear transaction date search.
   */
  clearTransactionSearch(): void {

    this.fromDate = '';
    this.toDate = '';

    if (this.account) {

      this.loadTransactions(
        this.account.id,
        false
      );
    }
  }

  exportTransactionsCsv(): void {

    if (this.filteredTransactions.length === 0) {
      return;
    }

    const escapeCsv = (value: string | number): string => {
      const text = String(value);
      const safeText = /^[\t\r ]*[=+\-@]/.test(text)
        ? `'${text}`
        : text;

      return `"${safeText.replace(/"/g, '""')}"`;
    };

    const rows = [
      ['ID', 'Type', 'Amount', 'Balance After', 'Date', 'Status'],
      ...this.filteredTransactions.map(transaction => [
        transaction.id,
        this.getTransactionTypeLabel(transaction),
        transaction.amount,
        transaction.balanceAfter,
        transaction.createdOn,
        transaction.reversed
          ? 'REVERSED'
          : transaction.reversalOfTransactionId === null
            ? 'COMPLETED'
            : 'REVERSAL'
      ])
    ];

    const csv = rows
      .map(row => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    const accountLabel =
      (this.account?.accountNo || 'account')
        .replace(/[^a-z0-9_-]/gi, '-');

    link.href = url;

    link.download =
      `savings-${accountLabel}-transactions.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * ACTIVE -> Withdraw.
   *
   * Withdrawal is checked against
   * AVAILABLE balance, not total balance.
   */
  withdraw(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.withdrawErrorMessage =
        'Withdrawal is only allowed for ACTIVE savings accounts.';

      return;
    }

    if (
      this.withdrawAmount === null

      ||

      this.withdrawAmount ===
      undefined
    ) {

      this.withdrawErrorMessage =
        'Please enter a withdrawal amount.';

      return;
    }

    if (
      this.withdrawAmount <= 0
    ) {

      this.withdrawErrorMessage =
        'Withdrawal amount must be greater than zero.';

      return;
    }

    /*
     * Important:
     *
     * Withdrawal cannot exceed
     * available balance.
     *
     * Example:
     *
     * Balance = 1000
     * Hold = 200
     * Available = 800
     *
     * Withdrawal 900 -> rejected
     */
    if (
      this.withdrawAmount >
      this.availableBalance
    ) {

      this.withdrawErrorMessage =
        'Withdrawal amount cannot exceed available balance.';

      return;
    }

    this.processing = true;

    this.http.post<SavingsAccount | PendingMakerCheckerRequest>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/withdraw`,
      {
        amount:
          this.withdrawAmount
      },
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {
        if (this.isPendingMakerCheckerRequest(data)) {
          this.pendingApprovalId = data.id;
          this.withdrawAmount = null;
          this.successMessage = `Submitted for checker approval (pending #${data.id}).`;
          this.processing = false;
          this.loadAudits(this.account!.id);
          return;
        }

        this.account = data;
        this.pendingApprovalId = null;

        this.withdrawAmount = null;

        this.successMessage =
          'Withdrawal completed successfully.';

        this.processing = false;

        const accountId =
          data.id;

        this.loadTransactions(accountId);

        this.loadTransferAccounts(data);

        this.loadHolds();

        this.loadAudits(accountId);
      },

      error: (error) => {

        console.error(error);

        this.withdrawErrorMessage =
          error?.error?.message ||
          'Unable to complete withdrawal.';

        this.processing = false;
      }
    });
  }

  /**
   * Load savings account holds.
   */
  loadHolds(): void {

    if (!this.account) {
      return;
    }

    this.holdsLoading = true;

    this.http.get<SavingsHold[]>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/holds`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.holds =
          data || [];

        this.holdsLoading = false;
      },

      error: (error) => {

        console.error(
          'Unable to load holds:',
          error
        );

        this.holds = [];

        this.holdsLoading = false;

        /*
         * Do not show an error when the backend
         * HOLD API has not been implemented yet.
         *
         * This prevents the whole account page
         * from showing a global error.
         */
      }
    });
  }

  /**
   * ACTIVE -> Place Hold.
   *
   * Example:
   *
   * Balance = 1000
   * Hold = 200
   * Available = 800
   */
  placeHold(): void {

    if (!this.account) {
      return;
    }

    this.holdErrorMessage = '';
    this.holdSuccessMessage = '';

    if (
      this.account.status !== 'ACTIVE'
    ) {

      this.holdErrorMessage =
        'Only ACTIVE savings accounts can place a hold.';

      return;
    }

    if (
      this.holdAmount === null ||
      this.holdAmount === undefined
    ) {

      this.holdErrorMessage =
        'Please enter a hold amount.';

      return;
    }

    if (
      this.holdAmount <= 0
    ) {

      this.holdErrorMessage =
        'Hold amount must be greater than zero.';

      return;
    }

    if (
      this.holdAmount >
      this.availableBalance
    ) {

      this.holdErrorMessage =
        'Hold amount cannot exceed available balance.';

      return;
    }

    this.holdsLoading = true;

    const request = {
      amount: this.holdAmount,
      reason:
        this.holdReason?.trim() || null
    };

    const accountId = this.account.id;

    this.http.post<any>(
      `${this.apiBase}/savingsaccounts/${accountId}/holds`,
      request,
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.holdAmount = null;
        this.holdReason = '';

        this.holdSuccessMessage =
          'Hold placed successfully.';

        this.loadAudits(accountId);

        this.http.get<SavingsAccount>(
          `${this.apiBase}/savingsaccounts/${accountId}`,
          {
            headers: this.getAuthHeaders()
          }
        ).subscribe({

          next: (account) => {

            this.account = account;

            this.loadHolds();
          },

          error: (error) => {

            console.error(
              'Unable to refresh account after placing hold:',
              error
            );

            this.holdErrorMessage =
              'Hold placed, but account balances could not be refreshed.';

            this.holdsLoading = false;

            this.loadHolds();
          }
        });
      },

      error: (error) => {

        console.error(
          'Unable to place hold:',
          error
        );

        this.holdErrorMessage =
          error?.error?.message ||
          'Unable to place hold.';

        this.holdsLoading = false;
      }
    });
  }

  /**
   * Release an existing hold.
   */
  releaseHold(
    hold: SavingsHold
  ): void {

    if (!this.account) {
      return;
    }

    this.holdErrorMessage = '';
    this.holdSuccessMessage = '';

    const confirmed = confirm(
      `Are you sure you want to release hold #${hold.id}?`
    );

    if (!confirmed) {
      return;
    }

    this.holdsLoading = true;

    const accountId =
      this.account.id;

    this.http.post<any>(
      `${this.apiBase}/savingsaccounts/${accountId}/holds/${hold.id}/release`,
      {},
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        if (data?.account) {

          this.account =
            data.account;

        } else if (
          data &&
          data.id &&
          data.accountNo
        ) {

          this.account =
            data;
        }

        this.holdSuccessMessage =
          'Hold released successfully.';

        this.holdsLoading = false;

        this.loadHolds();

        this.loadAudits(accountId);
      },

      error: (error) => {

        console.error(
          'Unable to release hold:',
          error
        );

        this.holdErrorMessage =
          error?.error?.message ||
          'Unable to release hold.';

        this.holdsLoading = false;
      }
    });
  }

  refreshClosurePreview(accountId = this.account?.id): void {
    if (!accountId) {
      return;
    }

    this.closurePreviewLoading = true;
    this.closureErrorMessage = '';
    this.http.get<SavingsAccountClosePreview>(
      `${this.apiBase}/savingsaccounts/${accountId}/close-preview`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (preview) => {
        this.closurePreview = preview;
        const selectedIsAvailable = preview.destinationAccounts.some(
          destination => destination.id === this.selectedClosureDestinationAccountId
        );
        if (!selectedIsAvailable) {
          this.selectedClosureDestinationAccountId =
            preview.destinationAccounts[0]?.id ?? null;
        }
        this.closurePreviewLoading = false;
      },
      error: (error) => {
        console.error('Unable to load close preview:', error);
        this.closureErrorMessage =
          error?.error?.message || 'Unable to load close preview.';
        this.closurePreviewLoading = false;
      }
    });
  }

  closeAndSettle(): void {
    if (!this.account || !this.closurePreview?.canClose) {
      return;
    }

    if (
      this.closurePreview.residualAmount > 0
      && this.selectedClosureDestinationAccountId === null
    ) {
      this.closureErrorMessage = 'Select a destination account for the residual balance.';
      return;
    }

    const confirmed = confirm(
      `Confirm close & settle? Closure fee: ${this.closurePreview.closureFeeAmount}. `
      + `Residual transfer: ${this.closurePreview.residualAmount}.`
    );
    if (!confirmed) {
      return;
    }

    this.processing = true;
    this.closureErrorMessage = '';
    this.closureSuccessMessage = '';
    this.http.post<SavingsAccountClosureResult>(
      `${this.apiBase}/savingsaccounts/${this.account.id}/close-and-settle`,
      { destinationAccountId: this.selectedClosureDestinationAccountId },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (result) => {
        this.account = result.account;
        this.processing = false;

        if (result.status === 'PENDING_APPROVAL') {
          this.closureSuccessMessage =
            `Residual transfer submitted for maker-checker approval (request #${result.pendingRequestId}). `
            + 'After approval, refresh the preview and confirm close & settle again.';
        } else {
          this.closureSuccessMessage = 'Savings account closed and settled successfully.';
          this.transferAccounts = [];
          this.selectedDestinationAccountId = null;
        }

        this.loadTransactions(result.account.id);
        this.loadAudits(result.account.id);
        this.refreshClosurePreview(result.account.id);
      },
      error: (error) => {
        console.error('Unable to close and settle savings account:', error);
        this.closureErrorMessage =
          error?.error?.message || 'Unable to close and settle savings account.';
        this.processing = false;
        this.refreshClosurePreview();
      }
    });
  }

  /**
   * Load savings account audit history.
   */
  loadAudits(accountId: number): void {

    this.auditsLoading = true;
    this.auditErrorMessage = '';

    this.http.get<SavingsAccountAudit[]>(
      `${this.apiBase}/savingsaccounts/${accountId}/audits`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.audits =
          data || [];

        this.auditsLoading = false;
      },

      error: (error) => {

        console.error(
          'Unable to load audit history:',
          error
        );

        this.audits = [];

        this.auditErrorMessage =
          error?.error?.message ||
          'Unable to load audit history.';

        this.auditsLoading = false;
      }
    });
  }

  getAuditEventClass(eventType: string): string {
    const normalizedEventType = eventType.toUpperCase();

    if (
      normalizedEventType.includes('DEPOSIT') ||
      normalizedEventType.includes('WITHDRAW') ||
      normalizedEventType.includes('TRANSFER') ||
      normalizedEventType.includes('FEE') ||
      normalizedEventType.includes('INTEREST') ||
      normalizedEventType.includes('REVERS')
    ) {
      return 'audit-event-financial';
    }

    if (
      normalizedEventType.includes('HOLD') ||
      normalizedEventType.includes('FREEZE') ||
      normalizedEventType.includes('UNFREEZE')
    ) {
      return 'audit-event-control';
    }

    return 'audit-event-account';
  }

  /**
   * Load account notes.
   */
  loadNotes(accountId: number): void {

    this.notesLoading = true;
    this.noteErrorMessage = '';

    this.http.get<SavingsAccountNote[]>(
      `${this.apiBase}/savingsaccounts/${accountId}/notes`,
      {
        headers: this.getAuthHeaders()
      }
    ).subscribe({

      next: (data) => {

        this.notes =
          data || [];

        this.notesLoading = false;
      },

      error: (error) => {

        console.error(
          'Unable to load account notes:',
          error
        );

        this.notes = [];

        this.noteErrorMessage =
          error?.error?.message ||
          'Unable to load account notes.';

        this.notesLoading = false;
      }
    });
  }

  /**
   * Add a new account note.
   */
  addNote(): void {

    if (!this.account) {
      return;
    }

    this.clearMessages();

    const body =
      this.noteBody.trim();

    if (!body) {

      this.noteErrorMessage =
        'Please enter a note.';

      return;
    }

    if (body.length > 500) {

      this.noteErrorMessage =
        'Note cannot exceed 500 characters.';

      return;
    }

    this.addingNote = true;

    const accountId =
      this.account.id;

    this.http.post<SavingsAccountNote>(
      `${this.apiBase}/savingsaccounts/${accountId}/notes`,
      {
        body
      },
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: (note) => {

        this.noteBody = '';

        this.noteSuccessMessage =
          'Note added successfully.';

        this.addingNote = false;

        this.loadNotes(accountId);
      },

      error: (error) => {

        console.error(
          'Unable to add note:',
          error
        );

        this.noteErrorMessage =
          error?.error?.message ||
          'Unable to add note.';

        this.addingNote = false;
      }
    });
  }

  /**
   * Delete an account note.
   */
  deleteNote(
    note: SavingsAccountNote
  ): void {

    if (!this.account) {
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to delete this note?'
    );

    if (!confirmed) {
      return;
    }

    this.noteErrorMessage = '';
    this.noteSuccessMessage = '';

    const accountId =
      this.account.id;

    this.notesLoading = true;

    this.http.delete(
      `${this.apiBase}/savingsaccounts/${accountId}/notes/${note.id}`,
      {
        headers:
          this.getAuthHeaders()
      }
    ).subscribe({

      next: () => {

        this.noteSuccessMessage =
          'Note deleted successfully.';

        this.loadNotes(accountId);
      },

      error: (error) => {

        console.error(
          'Unable to delete note:',
          error
        );

        this.noteErrorMessage =
          error?.error?.message ||
          'Unable to delete note.';

        this.notesLoading = false;
      }
    });
  }

  /**
   * Go back to previous page.
   */
  goBack(): void {

    window.history.back();
  }

  /**
   * Clear ALL messages.
   */
  clearMessages(clearInterestPreview: boolean = true): void {

    this.errorMessage = '';

    this.successMessage = '';

    this.withdrawErrorMessage = '';

    this.undoErrorMessage = '';

    this.transferErrorMessage = '';

    this.transferSuccessMessage = '';

    this.freezeMessage = '';

    this.holdErrorMessage = '';

    this.holdSuccessMessage = '';

    this.noteErrorMessage = '';

    this.noteSuccessMessage = '';

    this.interestErrorMessage = '';

    if (clearInterestPreview) {
      this.interestPreviewData = null;
    }
  }

  /**
   * Authentication headers.
   */
  private getAuthHeaders(): HttpHeaders {

    const authHeader =
      localStorage.getItem('authHeader');

    return authHeader

      ? new HttpHeaders({
        Authorization: authHeader
      })

      : new HttpHeaders();
  }

  private isPendingMakerCheckerRequest(
    response: SavingsAccount | PendingMakerCheckerRequest
  ): response is PendingMakerCheckerRequest {
    return response.status === 'PENDING' && 'savingsAccountId' in response;
  }
}