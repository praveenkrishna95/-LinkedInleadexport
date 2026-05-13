import { Router } from "express";
import Lead from "../models/Lead.js";

const router = Router();

router.get("/leads", async (_req, res, next) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

export default router;

