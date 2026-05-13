import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";
import exportRoutes from "./routes/exportRoutes.js";
import leadsRoutes from "./routes/leadsRoutes.js";
import scrapeRoutes from "./routes/scrapeRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "LinkedIn lead export API is running" });
});

app.use("/", scrapeRoutes);
app.use("/", leadsRoutes);
app.use("/", exportRoutes);
app.use("/api", scrapeRoutes);
app.use("/api", leadsRoutes);
app.use("/api", exportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Unexpected server error"
  });
});

await connectDB();

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
