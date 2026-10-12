const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const { connectDB } = require('../config/db');

// In-Memory Ring Buffer (holds up to 500 recent items if MongoDB is offline or in demo mode)
const inMemoryBuffer = [];
const MAX_BUFFER_SIZE = 500;

// SSE Subscribers list
const sseClients = new Set();

/**
 * Helper to broadcast telemetry packet to all connected SSE clients
 */
function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Helper to push to in-memory buffer
 */
function pushToBuffer(record) {
  inMemoryBuffer.unshift(record);
  if (inMemoryBuffer.length > MAX_BUFFER_SIZE) {
    inMemoryBuffer.pop();
  }
}

/**
 * POST /api/telemetry
 * High-performance ingestion endpoint for single or batch telemetry packets.
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  const rawBody = req.body;

  if (!rawBody) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  const packets = Array.isArray(rawBody) ? rawBody : [rawBody];

  if (packets.length === 0) {
    return res.status(400).json({ error: 'At least one telemetry packet is required' });
  }

  // Validate required fields
  const validatedPackets = [];
  for (let i = 0; i < packets.length; i++) {
    const p = packets[i];
    if (!p.unitId || p.cpuUsage === undefined || p.ramUsage === undefined || p.uptime === undefined) {
      return res.status(400).json({
        error: `Invalid packet at index ${i}: unitId, cpuUsage, ramUsage, and uptime are required.`,
      });
    }

    const ramTotal = Number(p.ramTotal || 16384);
    const ramUsage = Number(p.ramUsage);
    const cpuUsage = Number(p.cpuUsage);
    const ramPercentage = p.ramPercentage !== undefined ? Number(p.ramPercentage) : Number(((ramUsage / ramTotal) * 100).toFixed(2));
    const temperature = Number(p.temperature || 45.0);
    const networkLatency = Number(p.networkLatency || 12.0);

    let status = p.status || 'ONLINE';
    if (cpuUsage > 90 || temperature > 85) {
      status = 'CRITICAL';
    } else if (cpuUsage > 75 || temperature > 70) {
      status = 'WARNING';
    }

    const timestamp = p.timestamp ? new Date(p.timestamp) : new Date();

    validatedPackets.push({
      unitId: String(p.unitId).trim().toUpperCase(),
      timestamp,
      cpuUsage,
      ramUsage,
      ramTotal,
      ramPercentage,
      uptime: Number(p.uptime),
      temperature,
      networkLatency,
      status,
      eventCode: p.eventCode || (status === 'CRITICAL' ? 'ERR_SYS_CRITICAL' : status === 'WARNING' ? 'WARN_METRIC_HIGH' : 'SYS_OK_200'),
      eventMessage: p.eventMessage || (status === 'CRITICAL' ? 'Critical thresholds exceeded' : status === 'WARNING' ? 'System operating under high load' : 'Normal operational parameters'),
      metadata: p.metadata || {
        firmwareVersion: 'v2.4.1',
        region: 'us-east',
        clientIp: req.ip || '127.0.0.1',
      },
    });
  }

  let dbConnected = false;
  let savedPackets = [];

  try {
    const db = await connectDB();
    if (db && db.connection && db.connection.readyState === 1) {
      dbConnected = true;
      savedPackets = await Telemetry.insertMany(validatedPackets, { ordered: false });
    }
  } catch (err) {
    console.warn('[Telemetry] DB insert error, falling back to memory buffer:', err.message);
  }

  // Fallback to in-memory buffer if DB is not available
  if (!dbConnected) {
    validatedPackets.forEach((p) => {
      const memoryRecord = {
        _id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...p,
      };
      pushToBuffer(memoryRecord);
      savedPackets.push(memoryRecord);
    });
  }

  // Push latest packets to SSE subscribers
  savedPackets.forEach((p) => broadcastSSE(p));

  const latencyMs = Date.now() - startTime;

  return res.status(201).json({
    success: true,
    ingestedCount: savedPackets.length,
    dbMode: dbConnected ? 'mongodb' : 'memory-buffer',
    latencyMs,
    packet: savedPackets[0],
  });
});

/**
 * GET /api/telemetry
 * Retrieve time-series telemetry records with query filtering.
 */
router.get('/', async (req, res) => {
  try {
    const { unitId, status, eventCode, limit = 50, since } = req.query;
    const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);

    const query = {};
    if (unitId && unitId !== 'ALL') {
      query.unitId = unitId.toUpperCase();
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (eventCode) {
      query.eventCode = eventCode;
    }
    if (since) {
      query.timestamp = { $gte: new Date(since) };
    }

    let records = [];
    let dbConnected = false;

    try {
      const db = await connectDB();
      if (db && db.connection && db.connection.readyState === 1) {
        dbConnected = true;
        records = await Telemetry.find(query).sort({ timestamp: -1 }).limit(maxLimit).lean();
      }
    } catch (err) {
      console.warn('[Telemetry] DB query error, using in-memory buffer:', err.message);
    }

    // Fallback: query in-memory buffer
    if (!dbConnected) {
      records = inMemoryBuffer.filter((p) => {
        if (query.unitId && p.unitId !== query.unitId) return false;
        if (query.status && p.status !== query.status) return false;
        if (query.eventCode && p.eventCode !== query.eventCode) return false;
        if (query.timestamp && new Date(p.timestamp) < query.timestamp.$gte) return false;
        return true;
      }).slice(0, maxLimit);
    }

    return res.json({
      success: true,
      count: records.length,
      dbMode: dbConnected ? 'mongodb' : 'memory-buffer',
      data: records,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/stats
 * Fleet health statistics, averages, and alert summaries.
 */
router.get('/stats', async (req, res) => {
  try {
    let rawRecords = [];
    let dbConnected = false;

    try {
      const db = await connectDB();
      if (db && db.connection && db.connection.readyState === 1) {
        dbConnected = true;
        rawRecords = await Telemetry.find().sort({ timestamp: -1 }).limit(200).lean();
      }
    } catch (err) {
      console.warn('[Telemetry Stats] DB error, using buffer:', err.message);
    }

    if (!dbConnected) {
      rawRecords = inMemoryBuffer.slice(0, 200);
    }

    // Group by unit to get latest snapshot per unit
    const unitMap = new Map();
    let totalCpu = 0;
    let totalRamPerc = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let onlineCount = 0;

    rawRecords.forEach((item) => {
      if (!unitMap.has(item.unitId)) {
        unitMap.set(item.unitId, item);
      }
    });

    const activeUnits = Array.from(unitMap.values());
    const unitsCount = activeUnits.length;

    activeUnits.forEach((u) => {
      totalCpu += u.cpuUsage || 0;
      totalRamPerc += u.ramPercentage || 0;
      if (u.status === 'CRITICAL') criticalCount++;
      else if (u.status === 'WARNING') warningCount++;
      else onlineCount++;
    });

    const avgCpu = unitsCount > 0 ? Number((totalCpu / unitsCount).toFixed(1)) : 0;
    const avgRam = unitsCount > 0 ? Number((totalRamPerc / unitsCount).toFixed(1)) : 0;

    // Calculate Fleet Health Index (100 - penalties for warning & critical)
    let healthScore = 100;
    if (unitsCount > 0) {
      healthScore = Math.max(0, Math.round(100 - (criticalCount * 25 + warningCount * 10) / unitsCount));
    }

    // Count recent alerts
    const alerts = rawRecords.filter((r) => r.status === 'CRITICAL' || r.status === 'WARNING').slice(0, 20);

    return res.json({
      success: true,
      dbMode: dbConnected ? 'mongodb' : 'memory-buffer',
      stats: {
        totalUnits: unitsCount,
        onlineUnits: onlineCount,
        warningUnits: warningCount,
        criticalUnits: criticalCount,
        averageCpu: avgCpu,
        averageRam: avgRam,
        healthScore,
        totalPackets: rawRecords.length,
        activeAlertsCount: alerts.length,
      },
      recentAlerts: alerts,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/units
 * Get list of known remote automation units with their latest state.
 */
router.get('/units', async (req, res) => {
  try {
    let source = inMemoryBuffer;
    let dbConnected = false;

    try {
      const db = await connectDB();
      if (db && db.connection && db.connection.readyState === 1) {
        dbConnected = true;
        source = await Telemetry.find().sort({ timestamp: -1 }).limit(300).lean();
      }
    } catch (err) {
      console.warn('[Telemetry Units] DB error, using buffer:', err.message);
    }

    const unitMap = new Map();
    source.forEach((item) => {
      if (!unitMap.has(item.unitId)) {
        unitMap.set(item.unitId, item);
      }
    });

    const unitsList = Array.from(unitMap.values()).map((u) => ({
      unitId: u.unitId,
      status: u.status,
      cpuUsage: u.cpuUsage,
      ramPercentage: u.ramPercentage,
      temperature: u.temperature,
      uptime: u.uptime,
      eventCode: u.eventCode,
      lastHeartbeat: u.timestamp,
    }));

    return res.json({
      success: true,
      units: unitsList,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/stream
 * Server-Sent Events (SSE) endpoint for real-time live streaming of telemetry packets.
 */
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (NGINX/Vercel)

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Telemetry Stream Established' })}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

/**
 * POST /api/telemetry/mock
 * Helper endpoint to instantly trigger simulated mock packets directly from the web client.
 */
router.post('/mock', async (req, res) => {
  const units = ['UNIT-ALPHA-01', 'UNIT-BETA-02', 'UNIT-GAMMA-03', 'UNIT-DELTA-04', 'UNIT-TITAN-05'];
  const generatedPackets = units.map((unitId) => {
    const isStress = Math.random() < 0.2;
    const cpuUsage = isStress ? Math.floor(Math.random() * 25) + 75 : Math.floor(Math.random() * 45) + 15;
    const ramUsage = Math.floor(Math.random() * 6000) + 4000;
    const temperature = isStress ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 20) + 40;
    const uptime = Math.floor(Math.random() * 86400) + 1200;

    let status = 'ONLINE';
    let eventCode = 'SYS_OK_200';
    let eventMessage = 'Nominal operational status';

    if (cpuUsage > 90 || temperature > 85) {
      status = 'CRITICAL';
      eventCode = 'ERR_THERMAL_THROTTLE';
      eventMessage = 'Critical temperature/CPU overload detected';
    } else if (cpuUsage > 75 || temperature > 70) {
      status = 'WARNING';
      eventCode = 'WARN_HIGH_LOAD';
      eventMessage = 'System load exceeds threshold';
    }

    return {
      unitId,
      timestamp: new Date(),
      cpuUsage,
      ramUsage,
      ramTotal: 16384,
      uptime,
      temperature,
      networkLatency: Math.floor(Math.random() * 30) + 5,
      status,
      eventCode,
      eventMessage,
    };
  });

  // Re-use POST ingestion logic
  req.body = generatedPackets;
  return router.handle(req, res);
});

module.exports = router;
