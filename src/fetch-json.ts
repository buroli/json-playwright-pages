import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { chromium } from 'playwright';

const OUTPUT_PATH = path.resolve(process.cwd(), 'public', 'data.json');

async function fetchRemoteJson(jsonUrl: string): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'UTC',
      extraHTTPHeaders: {
        Accept: 'application/json, text/plain, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://example.com/',
      },
    });

    const page = await context.newPage();
    const response = await page.goto(jsonUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    if (!response) {
      throw new Error(`No HTTP response received from ${jsonUrl}.`);
    }

    const status = response.status();
    const statusText = response.statusText();
    const contentType = response.headers()['content-type'] ?? 'unknown';
    const text = await response.text();
    const bytes = Buffer.byteLength(text, 'utf8');

    console.log(`HTTP status: ${status} ${statusText}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Response size: ${bytes} bytes`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    if (!response.ok()) {
      const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 500);
      console.error(`Server returned an error page snippet: ${snippet || '(empty body)'}`);
      throw new Error(`HTTP ${status} returned for ${jsonUrl}.`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error(`Empty response body received from ${jsonUrl}.`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON received from ${jsonUrl}: ${detail}`);
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

    console.log(`Saved validated JSON to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const jsonUrl = process.env.JSON_URL?.trim();

  if (!jsonUrl) {
    throw new Error(
      'JSON_URL is not set. Export it before running the script, for example: JSON_URL="https://example.com/data.json" npm run fetch',
    );
  }

  try {
    new URL(jsonUrl);
  } catch {
    throw new Error(`JSON_URL is not a valid URL: ${jsonUrl}`);
  }

  await fetchRemoteJson(jsonUrl);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to fetch JSON: ${message}`);
  process.exitCode = 1;
});
