## 2024-05-18 - Prevent information leakage in API error handlers
**Vulnerability:** Information leakage through unhandled API errors in Express. The global error handler in `server.ts` would expose `err.message` to clients directly, even for 500-level internal server errors.
**Learning:** Returning `err.message` raw is an anti-pattern because external libraries or lower-level system operations often generate errors containing sensitive data like database queries, internal file paths, or configuration variables.
**Prevention:** Always check if the error is an internal server error (e.g., status 500). If so, replace the detailed message with a generic and safe fallback message like "Error interno del servidor", ensuring internal system details are never leaked to clients.
