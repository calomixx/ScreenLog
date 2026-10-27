## 2024-05-18 - Hardcoded TMDB API Key Fallback
**Vulnerability:** The application had a hardcoded TMDB API key (`TMDB_DEFAULT_KEY`) used as a fallback if the environment variable `TMDB_API_KEY` was missing.
**Learning:** This exposes the key publicly in the repository, making it susceptible to unauthorized use.
**Prevention:** External API keys should never be hardcoded, even as fallbacks. The application should fail securely (e.g., return empty search results) when an API key is absent.
