## 2026-10-29 - [Hardcoded API Key Removed]
**Vulnerability:** A hardcoded API key (TMDB_DEFAULT_KEY) was present in the code and used as a fallback if the environment variable was missing.
**Learning:** Hardcoded credentials can easily leak and be abused. External integrations must fail gracefully (e.g., returning empty results or null) when API keys are absent.
**Prevention:** Never hardcode secrets. Ensure functions interacting with external APIs handle missing configuration securely without throwing unhandled exceptions.
