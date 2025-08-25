import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // npm install node-fetch

const configFile = path.join(process.cwd(), "config.json");

export default async function handler(req, res) {
  if (req.method === "POST") {
    const config = req.body;

    try {
      // 1️⃣ Store securely in Backend A
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      console.log("✅ Config stored securely in Backend A");

      // 2️⃣ Immediately forward to Backend B
      // Backend A: /api/config
      app.post("/api/config", async (req, res) => {
        try {
          const config = req.body;

          // 👉 forward to Backend B
          await fetch("https://backend-b.com/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
          });

          // 👉 always send JSON back to frontend
          res.json({ success: true, message: "Config forwarded", config });
        } catch (err) {
          console.error("Error forwarding config:", err);
          res.status(500).json({ error: "Failed to forward config" });
        }
      });



      if (!response.ok) {
        throw new Error(`Backend B responded with ${response.status}`);
      }

      console.log("✅ Config sent successfully from Backend A → Backend B");

      res.status(200).json({ message: "Config saved and forwarded successfully" });
    } catch (err) {
      console.error("❌ Error saving or forwarding config:", err.message);
      res.status(500).json({ error: "Failed to save or forward config" });
    }
  } else if (req.method === "GET") {
    // Optional: retrieve stored config
    if (fs.existsSync(configFile)) {
      const storedConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      return res.status(200).json(storedConfig);
    }
    res.status(200).json({});
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
