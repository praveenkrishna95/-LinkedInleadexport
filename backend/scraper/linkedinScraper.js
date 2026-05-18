import fs from "node:fs/promises";
import path from "node:path";
import Lead from "../models/Lead.js";

const LINKEDIN_LOGIN_URL = "https://www.linkedin.com/login";
const LINKEDIN_FEED_URL = "https://www.linkedin.com/feed/";
const DEFAULT_QUERY = "Home Decor Showroom Owner USA";
const MAX_PAGES = 3;
const MANUAL_LOGIN_TIMEOUT = 5 * 60 * 1000;
const AUTO_LOGIN_TIMEOUT = 2 * 60 * 1000;
const AUTH_DIR = path.resolve(process.cwd(), ".auth");
const STORAGE_STATE_PATH = path.join(AUTH_DIR, "linkedin-storage.json");
const isRender = Boolean(process.env.RENDER);

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function getEmailFromText(value) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function normalizeProfileUrl(url) {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    return url.split("?")[0];
  }
}

function splitRoleAndCompany(role) {
  const [title, company] = role.split(/\s+at\s+/i);

  return {
    role: cleanText(title),
    company: cleanText(company)
  };
}

async function fileExists(filePath) {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

function isLinkedInSessionUrl(url) {
  return /linkedin\.com\/(feed|in|search|mynetwork|jobs)/.test(url);
}

async function saveLinkedInSession(context) {
  await fs.mkdir(AUTH_DIR, { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
}

async function hasActiveLinkedInSession(page) {
  await page.goto(LINKEDIN_FEED_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  return isLinkedInSessionUrl(page.url());
}

async function waitForManualLinkedInLogin(page, context) {
  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: "domcontentloaded" });

  if (isLinkedInSessionUrl(page.url())) {
    await saveLinkedInSession(context);
    return;
  }

  await page
    .waitForURL(/linkedin\.com\/(feed|in|search|mynetwork|jobs)/, {
      timeout: MANUAL_LOGIN_TIMEOUT
    })
    .catch(() => {
      throw new Error("Manual LinkedIn login timed out after 5 minutes. Click Start Scraping again and finish login in the opened browser.");
    });

  await saveLinkedInSession(context);
}

async function autoLoginToLinkedIn(page, context) {
  const email = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;

  if (!email || !password) {
    if (isRender) {
      throw new Error("Automatic LinkedIn login needs LINKEDIN_EMAIL and LINKEDIN_PASSWORD in Render environment variables.");
    }

    await waitForManualLinkedInLogin(page, context);
    return;
  }

  await page.goto(LINKEDIN_LOGIN_URL, { waitUntil: "domcontentloaded" });

  if (isLinkedInSessionUrl(page.url())) {
    await saveLinkedInSession(context);
    return;
  }

  await page.fill("#username", email, { timeout: 30000 });
  await page.fill("#password", password, { timeout: 30000 });
  await Promise.all([
    page.waitForURL(/linkedin\.com\/(feed|in|search|mynetwork|jobs|checkpoint)/, {
      timeout: AUTO_LOGIN_TIMEOUT
    }),
    page.click('button[type="submit"]')
  ]);

  const failedLogin = await page
    .locator("#error-for-password, #error-for-username, .form__label--error")
    .first()
    .isVisible()
    .catch(() => false);

  if (failedLogin) {
    throw new Error("LinkedIn automatic login failed. Check LINKEDIN_EMAIL and LINKEDIN_PASSWORD.");
  }

  if (!isLinkedInSessionUrl(page.url())) {
    throw new Error("LinkedIn needs security verification. Complete it manually once locally so the app can save a session.");
  }

  await saveLinkedInSession(context);
}

async function ensureLinkedInLogin(page, context) {
  if (await hasActiveLinkedInSession(page)) {
    await saveLinkedInSession(context);
    return;
  }

  await autoLoginToLinkedIn(page, context);
}

async function searchPeople(page, query) {
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

async function extractLeadCards(page) {
  return page.evaluate(() => {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    const seen = new Set();

    return anchors
      .map((anchor) => {
        const card =
          anchor.closest("li") ||
          anchor.closest(".reusable-search__result-container") ||
          anchor.closest('[data-view-name="search-entity-result-universal-template"]');

        const text = card ? card.innerText : anchor.innerText;
        const lines = text
          .split("\n")
          .map((line) => line.replace(/\s+/g, " ").trim())
          .filter(Boolean);

        const href = anchor.href;
        if (!href || seen.has(href)) return null;
        seen.add(href);

        const name = lines[0] || anchor.innerText || "Unknown";
        const role = lines.find((line) => !line.includes("degree") && line !== name) || "";
        const location =
          lines.find((line) => /United States|USA|Greater|Area|New York|California|Texas|Florida/i.test(line)) || "";

        return {
          name,
          role,
          location,
          company: "",
          email: emailPattern.exec(text)?.[0] || "",
          linkedinUrl: href
        };
      })
      .filter(Boolean);
  });
}

async function goToNextPage(page) {
  const nextButton = page.locator('button[aria-label="Next"], button:has-text("Next")').last();
  const isVisible = await nextButton.isVisible().catch(() => false);
  const isDisabled = isVisible ? await nextButton.isDisabled().catch(() => true) : true;

  if (!isVisible || isDisabled) {
    return false;
  }

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    nextButton.click()
  ]);
  await page.waitForTimeout(2500);
  return true;
}

async function saveLeads(rawLeads) {
  const saved = [];

  for (const rawLead of rawLeads) {
    const linkedinUrl = normalizeProfileUrl(rawLead.linkedinUrl);
    if (!linkedinUrl) continue;

    const lead = {
      ...splitRoleAndCompany(rawLead.role),
      name: cleanText(rawLead.name) || "Unknown",
      location: cleanText(rawLead.location),
      email: cleanText(rawLead.email) || getEmailFromText(JSON.stringify(rawLead)),
      linkedinUrl
    };

    const result = await Lead.findOneAndUpdate(
      { linkedinUrl },
      { $setOnInsert: lead },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    saved.push(result);
  }

  return saved;
}

export async function scrapeLinkedInLeads({
  query = DEFAULT_QUERY,
  maxPages = MAX_PAGES
} = {}) {
  if (isRender && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
  }

  const { chromium } = await import("playwright");
  const hasStorageState = await fileExists(STORAGE_STATE_PATH);
  const browser = await chromium.launch({
    headless: isRender || process.env.PLAYWRIGHT_HEADLESS === "true" ? true : false,
    slowMo: isRender ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    storageState: hasStorageState ? STORAGE_STATE_PATH : undefined
  });
  const page = await context.newPage();
  const collected = [];

  try {
    await ensureLinkedInLogin(page, context);
    await Lead.deleteMany({});
    await searchPeople(page, query);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const pageLeads = await extractLeadCards(page);
      collected.push(...pageLeads);

      if (pageNumber < maxPages) {
        const hasNext = await goToNextPage(page);
        if (!hasNext) break;
      }
    }

    const savedLeads = await saveLeads(collected);

    return {
      query,
      scrapedCount: collected.length,
      savedCount: savedLeads.length,
      leads: savedLeads
    };
  } catch (error) {
    throw new Error(`Scraping failed: ${error.message}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
