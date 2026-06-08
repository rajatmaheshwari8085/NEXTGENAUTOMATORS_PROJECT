const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();


// ================= MIDDLEWARE =================
app.use(express.json());

app.use(cors());

app.use(express.static("public"));


// ================= MONGODB CONNECTION =================
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/iotDB"
)

.then(() => {

  console.log("✅ MongoDB Connected");

})

.catch((err) => {

  console.log("❌ MongoDB Error:", err);

});


// ================= SCHEMA =================
const dataSchema = new mongoose.Schema({

  temperature: Number,

  soil: Number,

  distance: Number,

  pumpStatus: String,

  fanStatus: String,

  createdAt: {

    type: Date,

    default: Date.now

  }

});


// ================= MODEL =================
const Data = mongoose.model(
  "Data",
  dataSchema
);


// ================= DEVICE STATES =================
let deviceState = {

  pump: "AUTO",

  fan: "AUTO"

};


// ================= LAST ESP32 UPDATE =================
let lastESPUpdate = Date.now();


// ================= RECEIVE SENSOR DATA =================
app.post("/data", async (req, res) => {

  try {

    // UPDATE LAST ONLINE TIME
    lastESPUpdate = Date.now();


    // SENSOR DATA
    const incomingData = {

      temperature: req.body.temperature,

      soil: req.body.soil,

      distance: req.body.distance,

      // CURRENT DEVICE STATES
      pumpStatus: deviceState.pump,

      fanStatus: deviceState.fan

    };


    // SAVE TO DATABASE
    await Data.create(incomingData);


    console.log("📡 Sensor Data Received:");

    console.log(incomingData);


    // RESPONSE TO ESP32
    res.json({

      success: true,

      deviceState

    });

  }

  catch (err) {

    console.log("❌ POST /data Error:", err);

    res.status(500).json({

      success: false,

      message: "Server Error"

    });

  }

});


// ================= GET LATEST SENSOR DATA =================
app.get("/data", async (req, res) => {

  try {

    // CHECK ESP32 STATUS
    const now = Date.now();

    const espOnline =
      (now - lastESPUpdate) < 6000;


    // NO DATA FROM ESP32
    if (!espOnline) {

      return res.status(503).json({

        success: false,

        message: "ESP32 Offline"

      });

    }


    // GET LATEST DATA
    const latest = await Data.findOne()
      .sort({ createdAt: -1 });


    // IF DATABASE EMPTY
    if (!latest) {

      return res.json({

        temperature: 0,

        soil: 0,

        distance: 0,

        pumpStatus: deviceState.pump,

        fanStatus: deviceState.fan

      });

    }


    // SEND DATA
    res.json({

      temperature: latest.temperature,

      soil: latest.soil,

      distance: latest.distance,

      pumpStatus: deviceState.pump,

      fanStatus: deviceState.fan

    });

  }

  catch (err) {

    console.log("❌ GET /data Error:", err);

    res.status(500).json({

      success: false,

      message: "Server Error"

    });

  }

});


// ================= RELAY CONTROL =================
app.post("/relay", (req, res) => {

  try {

    const { device, state } = req.body;


    console.log("🎛 Relay Request:");

    console.log(device, state);


    // ================= PUMP =================
    if (device === "pump") {

      deviceState.pump = state;

    }


    // ================= FAN =================
    if (device === "fan") {

      deviceState.fan = state;

    }


    console.log("✅ Updated Device State:");

    console.log(deviceState);


    res.json({

      success: true,

      message: "Relay Updated",

      deviceState

    });

  }

  catch (err) {

    console.log("❌ Relay Error:", err);

    res.status(500).json({

      success: false,

      message: "Relay Control Failed"

    });

  }

});


// ================= GET RELAY STATUS =================
app.get("/relay", (req, res) => {

  res.json(deviceState);

});


// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {

  res.send("🚀 IoT Server Running");

});


// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`🚀 Server Running on Port ${PORT}`);

});