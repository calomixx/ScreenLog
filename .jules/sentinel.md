## 2025-03-05 - Fix hardcoded TMDB API key
**Vulnerability:** A hardcoded TMDB API key (`5aeed13f63f1071425b9ab7815b80949`) was present in `server/routes.ts` as a fallback when the `TMDB_API_KEY` environment variable was not set or was invalid.
**Learning:** Hardcoding fallback keys exposes credentials in the source code, posing a security risk. In this application, external services (like TMDB) must rely exclusively on environment variables, and functions should fail securely by returning empty arrays (`[]`) or `null` when the key is absent.
**Prevention:** Never hardcode secrets in the codebase. Always use environment variables for API keys and implement secure fallbacks (e.g., returning empty data structures) when they are missing.
