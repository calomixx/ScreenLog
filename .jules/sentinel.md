## 2024-11-02 - Removed hardcoded API key from TMDB fetching functions
**Vulnerability:** A fallback hardcoded TMDB API key was present in `server/routes.ts` within the `getValidTmdbKey` function.
**Learning:** Having fallback keys in source code can expose sensitive credentials in public repositories, defeating the purpose of using environment variables. It was also noted that external service integrations must fail securely (e.g. returning `[]` or `null`) when API keys are not supplied.
**Prevention:** Rely entirely on environment variables for API keys and implement checks that fail gracefully (returning `[]` or `null`) when these keys are missing.
