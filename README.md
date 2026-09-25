# JSON Playwright Pages

This repository periodically fetches a remote JSON document by opening the URL in a real Chromium browser with Playwright, validates the response, writes it to a public folder, and publishes that file through GitHub Pages.

The result is a stable JSON URL that can be consumed by another service:

https://<github-user>.github.io/<repository>/data.json

## Why Playwright instead of fetch() or curl?

The remote server blocks direct HTTP clients such as curl, Node.js fetch(), and axios, even though a normal browser can load the URL successfully. This project uses Playwright with Chromium because it performs the request in a real browser context, which matches the server's expected behavior.

The fetch script does not scrape a rendered page; it reads the actual HTTP response body and writes the JSON to disk.

## Repository setup

Required GitHub repository settings:

1. Enable GitHub Pages in the repository settings.
2. Set the Pages source to GitHub Actions.
3. Add a repository secret named JSON_URL with the URL to the remote JSON endpoint.
4. Keep the repository public or configure access as needed for GitHub Pages.

## Configure JSON_URL

The workflow expects the secret name JSON_URL. For local development, export it in the shell before running the script:

```bash
export JSON_URL="https://example.com/data.json"
npm run fetch
```

You can also run it inline:

```bash
JSON_URL="https://example.com/data.json" npm run fetch
```

## GitHub Pages deployment

The workflow in .github/workflows/update-json.yml runs on a 4-hour cron schedule and supports manual execution from the GitHub Actions UI.

GitHub Actions scheduled jobs run in UTC, so the cron expression is evaluated in UTC time.

## How the 4-hour schedule works

The workflow uses:

```yaml
schedule:
  - cron: '0 */4 * * *'
```

That means the job runs every 4 hours at minute 0 of each multiple-of-four hour in UTC.

## Manual execution

From the GitHub UI:

1. Open the repository.
2. Navigate to Actions.
3. Select Update JSON.
4. Click Run workflow.

This immediately runs the same fetch-and-deploy process without changing the repository code.

## Resulting JSON URL

After a successful deployment, the file is exposed at:

```text
https://<github-user>.github.io/<repository>/data.json
```

This stable path remains the same over time; the file is updated in place instead of using timestamped URLs.

## Consuming the JSON

Another service can fetch the JSON from the GitHub Pages URL:

```bash
curl -fsSL https://<github-user>.github.io/<repository>/data.json
```

or from any HTTP client that supports standard GET requests.

## Local fetching

Install dependencies and the Chromium browser:

```bash
npm install
npx playwright install chromium
```

Then run the fetch script:

```bash
JSON_URL="https://example.com/data.json" npm run fetch
```

The script writes the resulting JSON to public/data.json.

## Troubleshooting failed fetches

If the fetch fails, the workflow stops before deployment. The previous GitHub Pages version remains active.

Common issues:

- JSON_URL is missing or invalid.
- The remote server is offline or returning an error.
- The response body is empty or not valid JSON.
- Chromium is not installed for the environment.

Useful diagnostics printed by the script include:

- HTTP status
- Content-Type
- response size
- timestamp

The script does not print the raw JSON body unless needed for debugging.

## Security notes

This repository intentionally does not commit:

- secrets in URLs
- authentication tokens
- cookies
- .env files
- GitHub credentials
- Playwright storage state

The GitHub workflow reads the remote URL from the repository secret JSON_URL and never prints it in the logs.

## GitHub Pages caching

GitHub Pages may cache content for some time depending on CDN and browser behavior. That can delay how quickly updates become visible to consumers, even though the URL remains stable at /data.json. This project intentionally keeps the URL fixed so downstream services can continue to call the same path while the repository updates the file behind it.

## Scripts

```bash
npm run fetch
npm run check
```

The fetch script is the only part that uses Playwright/Chromium; the rest of the project stays small and intentionally minimal.
