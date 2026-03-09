import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GoogleGenAI } from "@google/genai";

const db = new Database("focusflow.db");

// Database Initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    device_id TEXT UNIQUE,
    status TEXT DEFAULT 'offline',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    app_name TEXT,
    url TEXT,
    title TEXT,
    duration INTEGER, -- in seconds
    classification TEXT, -- productive, neutral, distracting
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS app_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    app_name TEXT,
    classification TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, app_name)
  );
`);

// Seed Data
const seed = async () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount.count === 0) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const userResult = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run("demo@focusflow.com", hashedPassword, "Demo User");
    const userId = userResult.lastInsertRowid;

    db.prepare("INSERT INTO devices (user_id, device_id, status) VALUES (?, ?, ?)").run(userId, "A7F9K2", "online");

    const apps = [
      { name: "VS Code", class: "productive", duration: 5400 },
      { name: "Chrome", class: "neutral", duration: 2700, url: "google.com" },
      { name: "YouTube", class: "distracting", duration: 1800, url: "youtube.com" },
      { name: "Figma", class: "productive", duration: 3600 },
      { name: "Slack", class: "neutral", duration: 1200 }
    ];

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      apps.forEach(app => {
        db.prepare(`
          INSERT INTO activities (user_id, app_name, url, duration, classification, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, app.name, app.url || null, app.duration + Math.random() * 1000, app.class, `${dateStr} 12:00:00`);
      });
    }
  }
};
seed();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(email, hashedPassword, name);
      const token = jwt.sign({ id: result.lastInsertRowid, email, name }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email, name } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Activities
  app.get("/api/activities/today", authenticateToken, (req: any, res) => {
    const activities = db.prepare(`
      SELECT app_name, SUM(duration) as total_duration, classification 
      FROM activities 
      WHERE user_id = ? AND date(timestamp) = date('now')
      GROUP BY app_name, classification
      ORDER BY total_duration DESC
    `).all(req.user.id);
    res.json(activities);
  });

  app.get("/api/activities/stats", authenticateToken, (req: any, res) => {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN classification = 'productive' THEN duration ELSE 0 END) as productive,
        SUM(CASE WHEN classification = 'neutral' THEN duration ELSE 0 END) as neutral,
        SUM(CASE WHEN classification = 'distracting' THEN duration ELSE 0 END) as distracting
      FROM activities 
      WHERE user_id = ? AND date(timestamp) = date('now')
    `).get(req.user.id);
    res.json(stats);
  });

  app.get("/api/activities/history", authenticateToken, (req: any, res) => {
    const history = db.prepare(`
      SELECT date(timestamp) as day, 
             SUM(CASE WHEN classification = 'productive' THEN duration ELSE 0 END) as productive,
             SUM(CASE WHEN classification = 'distracting' THEN duration ELSE 0 END) as distracting
      FROM activities 
      WHERE user_id = ? 
      GROUP BY day 
      ORDER BY day DESC 
      LIMIT 7
    `).all(req.user.id);
    res.json(history);
  });

  // Log activity (Called by tracker)
  app.post("/api/activities/log", authenticateToken, (req: any, res) => {
    const { app_name, url, title, duration, classification } = req.body;
    db.prepare(`
      INSERT INTO activities (user_id, app_name, url, title, duration, classification)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, app_name, url, title, duration, classification);
    res.json({ success: true });
  });

  // Devices
  app.get("/api/devices", authenticateToken, (req: any, res) => {
    const devices = db.prepare("SELECT * FROM devices WHERE user_id = ?").all(req.user.id);
    res.json(devices);
  });

  app.post("/api/devices/pair", authenticateToken, (req: any, res) => {
    const { device_id } = req.body;
    try {
      db.prepare("INSERT INTO devices (user_id, device_id, status) VALUES (?, ?, 'online')").run(req.user.id, device_id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Device ID already registered" });
    }
  });

  // App Configs
  app.get("/api/configs", authenticateToken, (req: any, res) => {
    const configs = db.prepare("SELECT * FROM app_configs WHERE user_id = ?").all(req.user.id);
    res.json(configs);
  });

  app.post("/api/configs", authenticateToken, (req: any, res) => {
    const { app_name, classification } = req.body;
    db.prepare(`
      INSERT INTO app_configs (user_id, app_name, classification)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, app_name) DO UPDATE SET classification = excluded.classification
    `).run(req.user.id, app_name, classification);
    res.json({ success: true });
  });

  // Insights (AI)
  app.get("/api/insights", authenticateToken, async (req: any, res) => {
    const recentActivities = db.prepare(`
      SELECT app_name, duration, classification, timestamp 
      FROM activities 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 100
    `).all(req.user.id);

    if (recentActivities.length === 0) {
      return res.json({ insights: ["Start working to see productivity insights!"] });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these productivity logs and provide 3 short, motivational insights in a JSON array of strings.
        Logs: ${JSON.stringify(recentActivities)}`,
        config: { responseMimeType: "application/json" }
      });
      res.json({ insights: JSON.parse(response.text || "[]") });
    } catch (e) {
      res.json({ insights: ["You are doing great! Keep focusing on your main tasks."] });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
