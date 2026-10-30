## 2024-05-15 - [Information Leakage in Global API Error Handler]
**Vulnerability:** The global API error handler in `server.ts` directly exposes `err.message` to clients in 500 responses, posing an information leakage risk (e.g., exposing internal file paths or connection details).
**Learning:** This existed because the error message was directly taken from the error object regardless of the status code, missing a safe fallback for server errors.
**Prevention:** Always sanitize or obscure error messages for 500-level status codes, using generic messages like 'Error interno del servidor'.
