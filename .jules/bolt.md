## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Invoice Caching]
**Learning:** The `GET /invoices` route was executing a heavy database query every time, causing slow load times for the invoice list.
**Action:** Implemented Redis caching for the invoice list using `cacheInvoicesList` middleware. The cache is automatically invalidated when invoices are created, updated, or deleted. This significantly reduces database load for frequent reads.

## 2024-05-25 - [Sequelize Separate Queries]
**Learning:** The `GET /all-with-components` route in `tests.js` was performing a large Cartesian product query by joining `Test`, `TestComponent` (1:N), and `Question` (N:M) in a single SQL statement. This results in significant data duplication (multiplying test rows by components and questions).
**Action:** Implemented `separate: true` for the `components` and `questions` associations in the Sequelize query. This forces Sequelize to run separate efficient queries for these associations (using `WHERE id IN (...)`) and merge the results in memory, avoiding the Cartesian explosion and reducing data transfer.
