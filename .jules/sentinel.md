## YYYY-MM-DD - TMDB hardcoded key
**Vulnerability:** TMDB API key was hardcoded in server/routes.ts.
**Learning:** Hardcoded keys should be removed. When external services are used, credentials must rely on environment variables. If missing, fail securely rather than using a hardcoded fallback.
**Prevention:** Avoid hardcoding credentials in codebase.
