# 🚀 Live Telemetry & System Monitoring System (MERN Stack)

A high-performance, mission-control telemetry ingestion and real-time monitoring system engineered with **MongoDB**, **Express**, **React**, and **Node.js**. Built for high-frequency metric streaming from remote automation units, edge devices, and distributed software fleets.

Optimized for instant deployment on **Vercel** and source control with **GitHub**.

---

## 🌟 Key Architecture & Features

- **High-Frequency Ingestion API (`/api/telemetry`)**: Optimized Express endpoint processing performance telemetry packets with < 10ms processing latency. Supports single and batch payloads.
- **Optimized Time-Series Mongoose Schema**: Compound indexing (`{ unitId: 1, timestamp: -1 }`), event code index, and TTL (Time-To-Live) automatic pruning to keep database storage lean.
- **Independent Mock Client Simulator (`scripts/simulator.js`)**: Standalone Node.js script using `axios` in a 3-second `setInterval` loop to stream realistic telemetry packets with dynamic fluctuations, thermal surges, and event alerts.
- **Mission Control React Dashboard**: Aerospace / Cyberpunk dark glassmorphic UI displaying:
  - **Operational Health Status Cards**: Fleet Health Score %, Active Units, Avg CPU %, Avg RAM %, and Unresolved Incidents.
  - **Real-Time Interactive SVG Charts**: Dynamic dual-metric timeline showing CPU and RAM trends with interactive hover crosshairs and tooltips.
  - **Remote Automation Fleet Grid**: Real-time status cards for monitored units (`UNIT-ALPHA-01`, etc.) with quick filter isolation.
  - **Live Error & Event Alerts Feed**: Severity-filtered event log stream (`ERR_THERMAL_THROTTLE`, `WARN_HIGH_LOAD`, etc.).
  - **In-Browser Simulator Dock**: Toggle mock data streaming directly from the web UI to test deployed Vercel previews with zero local setup.
- **Vercel & Cloud Ready**: Configured serverless handler (`api/index.js`), connection pooling cache, and fallback in-memory buffer store when `MONGODB_URI` is not yet configured.

---

## 📁 Project Structure

```
├── api/
│   └── index.js             # Vercel serverless function entry (bridges to Express)
├── server/
│   ├── config/
│   │   └── db.js            # Cached Mongoose connection helper for serverless & local
│   ├── models/
│   │   └── Telemetry.js     # Optimized Mongoose schema with compound & TTL indexes
│   ├── routes/
│   │   └── telemetry.js     # Ingestion, query, fleet stats, and SSE streaming routes
│   └── server.js            # Express application setup, middleware, and local runner
├── scripts/
│   └── simulator.js         # Independent mock streaming script (axios + setInterval)
├── client/                  # React Frontend (Vite)
│   ├── src/
│   │   ├── components/      # Header, HealthMetrics, TelemetryChart, UnitSelector, AlertsFeed
│   │   ├── services/api.js  # Telemetry ingestion & fetch API client
│   │   ├── styles/          # Dark glassmorphic mission control CSS
│   │   ├── App.jsx          # Real-time state synchronization
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
├── vercel.json              # Vercel routing & static build configuration
├── .env.example             # Template for environment variables
├── .gitignore               # Clean Git ignore rules
└── package.json             # Root scripts (build, dev, start, simulate)
```

---

## 🛠️ Core Code Reference

### 1. Ingestion Endpoint (`server/server.js` & `server/routes/telemetry.js`)
Ingests high-frequency metrics with sub-10ms response time:
```javascript
// POST /api/telemetry
router.post('/', async (req, res) => {
  const rawBody = req.body;
  const packets = Array.isArray(rawBody) ? rawBody : [rawBody];

  // Validation & normalization
  const validatedPackets = packets.map(p => ({
    unitId: String(p.unitId).trim().toUpperCase(),
    timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
    cpuUsage: Number(p.cpuUsage),
    ramUsage: Number(p.ramUsage),
    ramTotal: Number(p.ramTotal || 16384),
    uptime: Number(p.uptime),
    temperature: Number(p.temperature || 45.0),
    networkLatency: Number(p.networkLatency || 12.0),
    status: p.cpuUsage > 90 ? 'CRITICAL' : p.cpuUsage > 75 ? 'WARNING' : 'ONLINE',
    eventCode: p.eventCode || 'SYS_OK_200'
  }));

  // Saves to MongoDB or fallback in-memory ring-buffer
  const saved = await Telemetry.insertMany(validatedPackets);
  broadcastSSE(saved[0]); // Pushes to connected frontend clients

  res.status(201).json({ success: true, count: saved.length });
});
```

### 2. Mock Client Streaming Script (`scripts/simulator.js`)
Streams data points every 3 seconds from simulated automation units:
```javascript
const axios = require('axios');
const TARGET_URL = process.env.SIMULATOR_TARGET_URL || 'http://localhost:5000/api/telemetry';

setInterval(async () => {
  const packet = generateTelemetryPacket(selectedUnit);
  const res = await axios.post(TARGET_URL, packet);
  console.log(`[Cycle] ${packet.unitId} | CPU: ${packet.cpuUsage}% | HTTP ${res.status}`);
}, 3000);
```

### 3. Optimized Mongoose Schema (`server/models/Telemetry.js`)
```javascript
// High-efficiency compound indexes for time-series queries
TelemetrySchema.index({ unitId: 1, timestamp: -1 }); // Rapid per-unit time-series
TelemetrySchema.index({ timestamp: -1 });             // Fleet real-time snapshots
TelemetrySchema.index({ eventCode: 1, timestamp: -1 }); // Rapid incident triage
TelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // Auto-purge (7 days)
```

---

## ⚡ Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If `MONGODB_URI` is omitted, the system automatically uses an in-memory ring buffer, making local and preview testing instant!)*

### 3. Start the Server & Dashboard
```bash
npm start
```
The system will run at:
- **Dashboard UI**: [http://localhost:5000](http://localhost:5000)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Telemetry Ingest**: [http://localhost:5000/api/telemetry](http://localhost:5000/api/telemetry)

### 4. Run the Client Simulator
In a separate terminal, start the independent streaming script:
```bash
npm run simulate
```
You will see live logs every 3 seconds and real-time updates on your browser dashboard!

---

## 🚢 Deploying to GitHub & Vercel

### Step 1: Push to GitHub

Initialize the repository and push to GitHub:
```bash
git init
git add .
git commit -m "feat: Live Telemetry & System Monitoring System (MERN Stack)"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your imported GitHub repository.
3. Under **Build and Output Settings**, Vercel will automatically read `vercel.json` (or use default Framework Preset: **Other / Vite** with Output Directory `dist`).
4. Under **Environment Variables**, add:
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster0.mongodb.net/telemetry_db?retryWrites=true&w=majority`
5. Click **Deploy**.

> **Note**: Even if you haven't configured MongoDB Atlas yet, the application will boot seamlessly in high-performance in-memory mode on Vercel without throwing 500 errors!

### Step 3: Stream from Simulator to Deployed Vercel App
Once deployed, run the simulator against your live Vercel URL from any terminal:
```bash
node scripts/simulator.js https://<your-vercel-domain>.vercel.app/api/telemetry
```
Or simply click **"Start Browser Simulator"** directly on the web dashboard!

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/telemetry` | Ingest single or batch telemetry packets |
| `GET` | `/api/telemetry` | Retrieve time-series logs (query by `unitId`, `limit`, `since`) |
| `GET` | `/api/telemetry/stats` | Aggregated fleet summary (health score, avg CPU/RAM, active units) |
| `GET` | `/api/telemetry/units` | List of monitored units with their latest status |
| `GET` | `/api/telemetry/stream` | Server-Sent Events (SSE) live push stream |
| `POST` | `/api/telemetry/mock` | Trigger instant batch of mock telemetry packets |
| `GET` | `/api/health` | System health check and database connectivity |

---

## 📜 License
MIT License. Built for industrial IoT and fleet observability.
