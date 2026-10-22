/**
 * Searchable activities — same idea as web-app/src/app/home/activities.ts,
 * limited to routes that exist in the training app.
 */
const activities: { activity: string; path: string }[] = [
  { activity: 'home', path: '/home' },

  { activity: 'users', path: '/users' },
  { activity: 'create user', path: '/users/create' },
  { activity: 'manage users', path: '/users' },

  { activity: 'clients', path: '/clients' },
  { activity: 'create client', path: '/clients/create' },
  { activity: 'manage clients', path: '/clients' },

  { activity: 'savings products', path: '/savingsproducts' },
  { activity: 'create savings product', path: '/savingsproducts/create' },
  { activity: 'manage savings products', path: '/savingsproducts' },

  { activity: 'savings accounts', path: '/savingsaccounts' },
  { activity: 'create savings account', path: '/savingsaccounts/create' },
  { activity: 'manage savings accounts', path: '/savingsaccounts' }
];

export { activities };
