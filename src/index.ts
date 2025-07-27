import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { apiKeyAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Configure CORS for production
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGINS?.split(",") || []
      : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend API is running!" });
});

// Protected API routes
app.get("/api/v1/shipments", apiKeyAuth, async (req, res) => {
  try {
    const records = await prisma.trackscargoDB.findMany();
    const shipments = records.map((record) => record.test);
    res.json({ shipments });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
