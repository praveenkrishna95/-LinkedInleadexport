import { Router } from "express";
import { scrapeLinkedInLeads } from "../scraper/linkedinScraper.js";

const router = Router();

function getScrapePayload(req) {
  return {
    query: req.body?.query || req.query.query || "Home Decor Showroom Owner USA",
    maxPages: Number(req.body?.maxPages || req.query.maxPages || 3)
  };
}

function validateScrapePayload(payload) {
  if (!payload.query.trim()) {
    const error = new Error("Search query is required");
    error.status = 400;
    throw error;
  }
}

router.post("/scrape", async (req, res, next) => {
  try {
    const payload = getScrapePayload(req);
    validateScrapePayload(payload);
    const result = await scrapeLinkedInLeads(payload);

    res.json({
      message: "Scraping completed",
      ...result
    });
  } catch (error) {
    error.status = error.status || 500;
    next(error);
  }
});

router.get("/scrape", async (req, res, next) => {
  try {
    const payload = getScrapePayload(req);
    validateScrapePayload(payload);
    const result = await scrapeLinkedInLeads(payload);

    res.json({
      message: "Scraping completed",
      ...result
    });
  } catch (error) {
    error.status = 500;
    next(error);
  }
});

export default router;
