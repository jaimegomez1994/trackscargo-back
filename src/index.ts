import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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
