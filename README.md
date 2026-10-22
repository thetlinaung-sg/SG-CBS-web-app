# SG-CBS web app

Angular 14 client for the SG-CBS training backend.

## Client savings portfolio

Open a client from **Clients → Edit** to view its savings portfolio. The portfolio
loads from `GET /mini-fineract-provider/api/v1/clients/{clientId}/savingsaccounts/portfolio`;
balances and status counts are returned by the backend. **Open** navigates to the
savings account detail, and **Create savings account** opens the create form with
that client preselected.

## Run

```bash
npm install
npm start
```

UI: http://localhost:4201
