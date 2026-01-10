## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.

## 2024-05-24 - [Optimized Medical Reports List Query]
**Learning:** The `GET /` endpoint for medical reports was fetching ALL report IDs first, then querying counts for all of them, and then fetching all reports with eager-loaded `tests` and `cultures`. This caused an N+1 problem and huge data transfer for large datasets, especially since the list view only needed counts.
**Action:** Refactored the query to use `sequelize.literal` subqueries for `tests_count`, `cultures_count`, and `test_groups_count`. Removed the initial ID fetch and the eager loading of test/culture arrays. This drastically reduces the number of database queries and the response payload size.
