## 2024-10-25 - Hardcoded Default TMDB API Key
**Vulnerability:** A hardcoded TMDB default API key was present in `server/routes.ts` as a fallback if the environment variable was missing.
**Learning:** Default fallback keys present a significant risk of being leaked in source control.
**Prevention:** Avoid defining default API keys in source code entirely. Application features requiring third-party authentication should be built to fail securely (e.g., returning empty datasets or `null` values) if the required keys are missing from environment configurations.
