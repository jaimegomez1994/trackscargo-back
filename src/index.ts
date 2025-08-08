import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { apiRoutes } from "./routes";

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

// Create uploads directory if it doesn't exist
// On Railway, use the mounted volume path, locally use ./uploads
const uploadDir = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "Trackscargo API is running!",
    version: "2.0.0",
    architecture: "Service Layer"
  });
});

// API routes
app.use("/api/v1", apiRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Trackscargo API Server running on port ${PORT}`);
  console.log(`📊 Architecture: Service Layer Pattern`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`📝 API Docs: http://localhost:${PORT}/api/v1/`);
});
