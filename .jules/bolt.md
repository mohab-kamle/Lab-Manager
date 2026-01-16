## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Invoice Caching]
**Learning:** The `GET /invoices` route was executing a heavy database query every time, causing slow load times for the invoice list.
**Action:** Implemented Redis caching for the invoice list using `cacheInvoicesList` middleware. The cache is automatically invalidated when invoices are created, updated, or deleted. This significantly reduces database load for frequent reads.
