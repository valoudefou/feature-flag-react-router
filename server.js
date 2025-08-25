import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // npm install node-fetch

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const configFile = path.join(process.cwd(), "config.json");

// POST /api/config → store securely AND immediately forward
app.post("/api/config", async (req, res) => {
    const config = req.body;

    try {
        // 1️⃣ Store securely in Backend A
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log("✅ Config stored securely in Backend A");

        // 2️⃣ Immediately forward to Backend B
        const response = await fetch("https://csv.live-server1.com/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            throw new Error(`Backend B responded with ${response.status}`);
        }

        console.log("✅ Config sent successfully from Backend A → Backend B");

        res.json({ message: "Config saved and forwarded successfully" });
    } catch (err) {
        console.error("❌ Error saving or forwarding config:", err.message);
        res.status(500).json({ error: "Failed to save or forward config" });
    }
});

// Optional: GET endpoint to see stored config
app.get("/api/config", (req, res) => {
    if (fs.existsSync(configFile)) {
        const storedConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
        return res.json(storedConfig);
    }
    res.json({});
});

app.listen(PORT, () => {
    console.log(`🚀 Backend A running on http://localhost:${PORT}`);
});
