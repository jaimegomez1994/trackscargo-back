import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGINS?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend API is running!" });
});

app.get("/shipments", (req, res) => {
  res.json({ shipments: ["XX1234567890", "XX1234567891"] });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
