const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const Sensor = require("./models/Sensor");

const app = express();
app.use(express.json());
app.use(cors());

// DB connect
connectDB();

// Relay state
let relayState = { relay1: false };


// 🔴 1. ESP32 → Data Save
app.post("/data", async (req, res) => {
  const { temperature, humidity, moisture } = req.body;

  const newData = new Sensor({
    temperature,
    humidity,
    moisture
  });

  await newData.save();
  res.send("Data Saved");
});


// 🟢 2. React → Get Data
app.get("/data", async (req, res) => {
  const data = await Sensor.find().sort({ timestamp: -1 }).limit(1);
  res.json(data);
});


// ⚡ 3. React → Control Relay
app.post("/control", (req, res) => {
  relayState.relay1 = req.body.relay1;
  res.send("Relay Updated");
});


// 🔌 4. ESP32 → Get Relay State
app.get("/control", (req, res) => {
  res.json(relayState);
});


// Server start
app.listen(3000, () => {
  console.log("Server running on port 3000");
});