## 2025-02-28 - Hardcoded API Key Fallback
**Vulnerability:** Hardcoded TMDB API key (`TMDB_DEFAULT_KEY`) in `server/routes.ts` used as a fallback.
**Learning:** Fallback keys meant to handle local environments without configured API keys introduce severe security risks by leaking valid credentials into source control and the public domain, bypassing intended credential management.
**Prevention:** External services MUST rely exclusively on environment variables or securely stored configurations. Functions that consume these keys must implement secure failure modes (e.g., returning empty arrays or `null`) when credentials are not configured, rather than providing hardcoded defaults.
