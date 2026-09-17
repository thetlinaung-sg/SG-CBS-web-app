# Frontend notes for the team

Angular 14-style layout matching **Mifos `web-app`**. Sample **Welcome** only.

## Structure

```text
frontend/src/app/
  app.module.ts
  app-routing.module.ts
  app.component.*
  home/                      ← like web-app/src/app/home
    home.module.ts
    home-routing.module.ts
    home.component.*
    home.service.ts
```

## Next steps

Add a `users/` feature module (list/create) that calls:

`GET/POST /mini-fineract-provider/api/v1/users`

## Run

```bash
npm install
npm start
```

UI: http://localhost:4201
