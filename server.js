import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // npm install node-fetch

const configFile = path.join(process.cwd(), "config.json");

export default async function handler(req, res) {
  if (req.method === "POST") {
    const config = req.body;

    try {
      // 1️⃣ Save locally
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      console.log("✅ Config stored locally");

      // 2️⃣ Forward to Backend B
      const response = await fetch("https://backend-b.com/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        let backendText;
        try {
          backendText = await response.text();
        } catch {
          backendText = 'No response text';
        }
        throw new Error(`Backend B responded with ${response.status}: ${backendText}`);
      }

      console.log("✅ Config forwarded to Backend B");
      res.status(200).json({ message: "Config saved and forwarded successfully" });

    } catch (err) {
      console.error("❌ Error saving or forwarding config:", err);

      // Structured JSON response with error and stack
      res.status(500).json({
        error: err.message || "Failed to save or forward config",
        stack: err.stack || null,
      });
    }

  } else if (req.method === "GET") {
    // Optional: return stored config
    if (fs.existsSync(configFile)) {
      const storedConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      return res.status(200).json(storedConfig);
    }
    res.status(200).json({});
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
