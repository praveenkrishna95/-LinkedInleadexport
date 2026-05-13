import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import json2csv from "json2csv";
import { Router } from "express";
import Lead from "../models/Lead.js";

const router = Router();
const { Parser } = json2csv;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportDir = path.join(__dirname, "..", "exports");

router.get("/export", async (_req, res, next) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).lean();
    const fields = ["name", "company", "role", "location", "email", "linkedinUrl", "createdAt"];
    const parser = new Parser({ fields });
    const csv = parser.parse(leads);
    const filePath = path.join(exportDir, "leads.csv");

    await fs.mkdir(exportDir, { recursive: true });
    await fs.writeFile(filePath, csv, "utf8");

    res.download(filePath, "leads.csv");
  } catch (error) {
    next(error);
  }
});

export default router;
