## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Avoid Cartesian Product in Invoice Fetching]
**Learning:** The `GET /invoices` endpoint used a raw SQL query with multiple `LEFT JOIN`s on one-to-many relationships (tests, cultures, packages), causing a massive Cartesian product. This resulted in redundant data transfer and high memory usage.
**Action:** Refactored the endpoint to use Sequelize `findAll` with `separate: true` for the `hasMany` associations. This splits the operation into multiple efficient queries (N+1 strategy optimized for bandwidth), eliminating data duplication.
