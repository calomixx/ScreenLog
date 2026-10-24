## 2024-05-18 - Hardcoded Third-Party API Key in Server Routes
**Vulnerability:** A hardcoded TMDB API key was present in the `server/routes.ts` file, used as a fallback if the environment variable was missing.
**Learning:** Third-party service integrations must be fully reliant on securely injected configuration. Hardcoding fallbacks defeats the purpose of environment variables and exposes the application to credential theft and rate-limit abuse by malicious actors analyzing the source code.
**Prevention:** Avoid defining default secrets in codebase constants. API fetching functions should perform defensive checks for required keys and fail securely (e.g., returning `null` or empty sets) rather than relying on a hardcoded fallback.
