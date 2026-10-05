const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const studentRoutes = require("./routes/studentRoutes");
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/students", studentRoutes);
app.get("/", (req, res) => res.send("Student API is running"));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.name === "CastError" ? 400 : 500).json({ message: "Unable to complete the request" });
});
async function start() {
  if (!process.env.MONGO_URI) throw new Error("Set MONGO_URI in backend/.env");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
  app.listen(5000, () => console.log("Server running on http://localhost:5000"));
}
start().catch(err => { console.error(err.message); process.exit(1); });
