import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { apiKeyAuth } from "./middleware/auth";
import { prisma } from "./lib/prisma";
import { body, param, validationResult } from "express-validator";
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

// Validation error handler
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array() });
  }
  next();
};

app.get("/", (req, res) => {
  res.json({ message: "Trackscargo API is running!" });
});

// Public tracking endpoint (no API key required)
app.get("/api/v1/track/:trackingNumber", 
  param("trackingNumber").isLength({ min: 3 }).withMessage("Tracking number must be at least 3 characters"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { trackingNumber } = req.params;
      
      const shipment = await prisma.shipment.findUnique({
        where: { trackingNumber },
        include: {
          travelEvents: {
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Format response to match frontend structure
      const response = {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        origin: shipment.origin,
        destination: shipment.destination,
        weight: shipment.weight,
        pieces: shipment.pieces,
        status: shipment.currentStatus,
        travelHistory: shipment.travelEvents.map(event => ({
          id: event.id,
          status: event.status,
          location: event.location,
          description: event.description,
          timestamp: event.timestamp.toISOString(),
          type: event.eventType
        }))
      };

      res.json(response);
    } catch (error) {
      console.error("Tracking error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Protected admin endpoints (require API key)
app.get("/api/v1/shipments", apiKeyAuth, async (req, res) => {
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
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/v1/shipments", apiKeyAuth,
  body("trackingNumber").isLength({ min: 3 }).withMessage("Tracking number is required"),
  body("origin").notEmpty().withMessage("Origin is required"),
  body("destination").notEmpty().withMessage("Destination is required"),
  body("weight").isNumeric().withMessage("Weight must be a number"),
  body("pieces").isInt({ min: 1 }).withMessage("Pieces must be a positive integer"),
  body("status").notEmpty().withMessage("Status is required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { trackingNumber, origin, destination, weight, pieces, status, company } = req.body;

      // Check if tracking number already exists
      const existingShipment = await prisma.shipment.findUnique({
        where: { trackingNumber }
      });

      if (existingShipment) {
        return res.status(400).json({ error: "Tracking number already exists" });
      }

      const shipment = await prisma.shipment.create({
        data: {
          trackingNumber,
          origin,
          destination,
          weight: parseFloat(weight),
          pieces: parseInt(pieces),
          currentStatus: status,
          company: company || null
        }
      });

      res.status(201).json({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        origin: shipment.origin,
        destination: shipment.destination,
        weight: shipment.weight,
        pieces: shipment.pieces,
        status: shipment.currentStatus,
        company: shipment.company
      });
    } catch (error) {
      console.error("Create shipment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/api/v1/shipments/:id/events", apiKeyAuth,
  param("id").isString().withMessage("Invalid shipment ID"),
  body("status").notEmpty().withMessage("Status is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("description").optional(),
  body("eventType").isIn(["picked-up", "in-transit", "delivered"]).withMessage("Invalid event type"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, location, description, eventType } = req.body;

      // Check if shipment exists
      const shipment = await prisma.shipment.findUnique({
        where: { id }
      });

      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Create travel event
      const travelEvent = await prisma.travelEvent.create({
        data: {
          shipmentId: id,
          status,
          location,
          description: description || "",
          timestamp: new Date(),
          eventType
        }
      });

      // Update shipment current status
      await prisma.shipment.update({
        where: { id },
        data: { currentStatus: status }
      });

      res.status(201).json({
        id: travelEvent.id,
        status: travelEvent.status,
        location: travelEvent.location,
        description: travelEvent.description,
        timestamp: travelEvent.timestamp.toISOString(),
        type: travelEvent.eventType
      });
    } catch (error) {
      console.error("Add event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
