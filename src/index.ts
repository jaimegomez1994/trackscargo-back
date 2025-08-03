import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import dotenv from "dotenv";
import { apiRoutes } from "./routes";

// Legacy imports (for backward compatibility)
import { apiKeyAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import { body, param, validationResult } from "express-validator";

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

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "Trackscargo API is running!",
    version: "2.0.0",
    architecture: "Service Layer"
  });
});

// New structured API routes
app.use("/api/v1", apiRoutes);

// ===================================
// LEGACY ROUTES (Backward Compatibility)
// ===================================
// These routes maintain the existing API for current frontend
// Will be deprecated once frontend migrates to new auth system

const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array() });
  }
  next();
};

// Legacy admin endpoints (API key protected)
app.get("/api/v1/shipments/legacy", apiKeyAuth, async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      include: {
        travelEvents: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = shipments.map(shipment => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      origin: shipment.origin,
      destination: shipment.destination,
      weight: shipment.weight,
      pieces: shipment.pieces,
      status: shipment.currentStatus,
      company: shipment.company,
      travelHistory: shipment.travelEvents.map(event => ({
        id: event.id,
        status: event.status,
        location: event.location,
        description: event.description,
        timestamp: event.timestamp.toISOString(),
        type: event.eventType
      }))
    }));

    res.json({ shipments: response });
  } catch (error) {
    console.error("Legacy get shipments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/v1/shipments/legacy", apiKeyAuth,
  body("trackingNumber").isLength({ min: 3 }).withMessage("Tracking number is required"),
  body("origin").notEmpty().withMessage("Origin is required"),
  body("destination").notEmpty().withMessage("Destination is required"),
  body("weight").isNumeric().withMessage("Weight must be a number"),
  body("pieces").isInt({ min: 1 }).withMessage("Pieces must be a positive integer"),
  body("status").notEmpty().withMessage("Status is required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      res.status(501).json({ 
        error: "Legacy endpoint. Please migrate to organization-based authentication.",
        migration_info: "Use POST /api/v1/auth/signup to create organization and POST /api/v1/shipments with JWT token"
      });
    } catch (error) {
      console.error("Legacy create shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/api/v1/shipments/legacy/:id/events", apiKeyAuth,
  param("id").isString().withMessage("Invalid shipment ID"),
  body("status").notEmpty().withMessage("Status is required."),
  body("location").notEmpty().withMessage("Location is required"),
  body("description").optional(),
  body("eventType").isIn(["picked-up", "in-transit", "delivered"]).withMessage("Invalid event type"),
  handleValidationErrors,
  async (req, res) => {
    try {
      res.status(501).json({ 
        error: "Legacy endpoint. Please migrate to organization-based authentication.",
        migration_info: "Use POST /api/v1/shipments/:id/events with JWT token"
      });
    } catch (error) {
      console.error("Legacy add event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Trackscargo API Server running on port ${PORT}`);
  console.log(`📊 Architecture: Service Layer Pattern`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`📝 API Docs: http://localhost:${PORT}/api/v1/`);
});
