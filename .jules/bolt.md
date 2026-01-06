## 2024-05-23 - [Route-based Code Splitting]
**Learning:** The application was bundling all routes into a single large JavaScript file. This causes slow initial load times.
**Action:** Implemented `React.lazy` and `Suspense` in `App.jsx` to split the code into chunks. This allows the browser to load only the necessary code for the current route.
