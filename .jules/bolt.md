## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Cartesian Product in Raw SQL]
**Learning:** The `GET /invoices` route was using a raw SQL query with multiple `LEFT JOIN`s, causing a massive Cartesian product (N*M*K rows) which was then filtered in memory. This resulted in excessive database load and data transfer.
**Action:** Replaced raw SQL with Sequelize `findAll` using `separate: true` for `hasMany` associations. This executes separate optimized queries (O(N+M+K)) and avoids the Cartesian explosion.
## 2024-05-24 - [Avoid Cartesian Product in Invoice Fetching]
**Learning:** The `GET /invoices` endpoint used a raw SQL query with multiple `LEFT JOIN`s on one-to-many relationships (tests, cultures, packages), causing a massive Cartesian product. This resulted in redundant data transfer and high memory usage.
**Action:** Refactored the endpoint to use Sequelize `findAll` with `separate: true` for the `hasMany` associations. This splits the operation into multiple efficient queries (N+1 strategy optimized for bandwidth), eliminating data duplication.
## 2024-05-24 - [Invoice Caching]
**Learning:** The `GET /invoices` route was executing a heavy database query every time, causing slow load times for the invoice list.
**Action:** Implemented Redis caching for the invoice list using `cacheInvoicesList` middleware. The cache is automatically invalidated when invoices are created, updated, or deleted. This significantly reduces database load for frequent reads.

## 2024-05-25 - [Optimizing Large IN Clauses]
**Learning:** Fetching IDs in a separate query to feed into an `IN` clause (application-side join) is a performance bottleneck when the dataset grows, causing memory issues and slow queries.
**Action:** Replaced the "fetch IDs then find" pattern in `medical_reports.js` with a single query using Sequelize `include` and `where` clauses to filter related data directly in the database.
