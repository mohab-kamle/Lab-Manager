## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Cartesian Product in Raw SQL]
**Learning:** The `GET /invoices` route was using a raw SQL query with multiple `LEFT JOIN`s, causing a massive Cartesian product (N*M*K rows) which was then filtered in memory. This resulted in excessive database load and data transfer.
**Action:** Replaced raw SQL with Sequelize `findAll` using `separate: true` for `hasMany` associations. This executes separate optimized queries (O(N+M+K)) and avoids the Cartesian explosion.
