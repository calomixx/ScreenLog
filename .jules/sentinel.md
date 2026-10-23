## 2024-03-24 - [CRITICAL] Fix hardcoded API key vulnerability
**Vulnerability:** A hardcoded TMDB API key (`TMDB_DEFAULT_KEY`) was present in `server/routes.ts` as a fallback when the environment variable was not set.
**Learning:** Hardcoding API keys directly in source code is a major security risk, especially in open-source projects or when code is shared. It exposes the application's third-party service accounts to potential abuse. The fallback logic was convenient for development but unacceptable for production security.
**Prevention:**
- Never hardcode secrets in source code files.
- Always retrieve secrets dynamically from environment variables or secure credential stores.
- Design applications to fail gracefully or fallback to alternative free/local methods if third-party credentials are not configured, rather than bundling a fallback key.