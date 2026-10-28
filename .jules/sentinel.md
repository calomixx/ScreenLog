## 2023-10-28 - Removed Hardcoded External API Key
**Vulnerability:** A fallback API key (`TMDB_DEFAULT_KEY`) for TMDB was hardcoded in `server/routes.ts` in case the `TMDB_API_KEY` environment variable was missing.
**Learning:** The architecture integrated external services like TMDB using environment variables, but improperly provided a hardcoded default key, which exposes credentials if the source code is compromised.
**Prevention:** Avoid providing hardcoded secrets as fallback for missing environment variables. Features depending on external APIs should fail securely (e.g., returning empty arrays `[]` or `null`) when the required credentials are not configured in the environment.
