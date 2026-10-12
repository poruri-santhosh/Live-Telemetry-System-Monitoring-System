/**
 * Independent Client Simulator Script
 *
 * Mocks streaming telemetry data points every 3 seconds from simulated
 * remote automation units / client machines using Axios in a setInterval loop.
 *
 * Usage:
 *   node scripts/simulator.js
 *   node scripts/simulator.js http://localhost:5000/api/telemetry
 *   node scripts/simulator.js https://your-app.vercel.app/api/telemetry
 */

const axios = require('axios');

// Target endpoint (defaults to localhost:5000/api/telemetry or CLI arg / env var)
const TARGET_URL = process.argv[2] || process.env.SIMULATOR_TARGET_URL || 'http://localhost:5000/api/telemetry';
const INTERVAL_MS = parseInt(process.env.SIMULATOR_INTERVAL_MS, 10) || 3000;

// Simulated Remote Automation Fleet
const FLEET_UNITS = [
  { id: 'UNIT-ALPHA-01', baseCpu: 28, baseTemp: 44, ramTotal: 16384, ramBase: 4200, uptime: 14200 },
  { id: 'UNIT-BETA-02', baseCpu: 45, baseTemp: 52, ramTotal: 16384, ramBase: 7100, uptime: 83500 },
  { id: 'UNIT-GAMMA-03', baseCpu: 18, baseTemp: 39, ramTotal: 32768, ramBase: 9200, uptime: 245000 },
  { id: 'UNIT-DELTA-04', baseCpu: 62, baseTemp: 61, ramTotal: 8192, ramBase: 5800, uptime: 4200 },
  { id: 'UNIT-TITAN-05', baseCpu: 35, baseTemp: 48, ramTotal: 32768, ramBase: 12000, uptime: 512000 },
];

let cycleCount = 0;

console.log('================================================================');
console.log('📡 REMOTE AUTOMATION FLEET TELEMETRY SIMULATOR');
console.log(`🎯 Target Ingestion Endpoint: ${TARGET_URL}`);
console.log(`⏱️  Transmission Interval:   ${INTERVAL_MS}ms (every ${INTERVAL_MS / 1000}s)`);
console.log(`🤖 Monitored Units:         ${FLEET_UNITS.map((u) => u.id).join(', ')}`);
console.log('================================================================\n');

/**
 * Generate a realistic telemetry packet for a specific unit
 */
function generateTelemetryPacket(unit) {
  // Advance uptime
  unit.uptime += Math.round(INTERVAL_MS / 1000);

  // CPU variation with occasional random spikes
  const spikeTrigger = Math.random();
  let cpuNoise = (Math.random() - 0.5) * 12;
  let cpu = Math.round(unit.baseCpu + cpuNoise);

  if (spikeTrigger > 0.93) {
    // Heavy workload / spike scenario
    cpu = Math.min(99, cpu + Math.floor(Math.random() * 35) + 20);
  } else if (spikeTrigger < 0.05) {
    // Idle lull
    cpu = Math.max(5, cpu - 15);
  }
  cpu = Math.max(2, Math.min(99, cpu));

  // Temperature correlated with CPU
  const tempOffset = (cpu / 100) * 22;
  const tempNoise = (Math.random() - 0.5) * 4;
  const temperature = Number((unit.baseTemp + tempOffset + tempNoise).toFixed(1));

  // RAM variation
  const ramNoise = (Math.random() - 0.5) * 300;
  const ramUsage = Math.round(Math.min(unit.ramTotal - 200, Math.max(1024, unit.ramBase + ramNoise)));
  const ramPercentage = Number(((ramUsage / unit.ramTotal) * 100).toFixed(2));

  // Network latency
  const networkLatency = Number((Math.random() * 25 + 8).toFixed(1));

  // Determine operational status & event codes
  let status = 'ONLINE';
  let eventCode = 'SYS_OK_200';
  let eventMessage = 'All telemetry sensors reporting normal operational parameters';

  if (cpu >= 90 || temperature >= 80) {
    status = 'CRITICAL';
    eventCode = 'ERR_THERMAL_THROTTLE';
    eventMessage = `Critical threshold exceeded: CPU=${cpu}%, Temp=${temperature}°C`;
  } else if (cpu >= 75 || temperature >= 70 || ramPercentage >= 85) {
    status = 'WARNING';
    eventCode = cpu >= 75 ? 'WARN_HIGH_LOAD' : 'WARN_MEM_PRESSURE';
    eventMessage = `Degraded state observed: CPU=${cpu}%, RAM=${ramPercentage}%`;
  } else if (Math.random() < 0.04) {
    // Rare event code simulation
    eventCode = 'INFO_ROUTINE_AUDIT';
    eventMessage = 'Self-diagnostic scheduled check passed';
  }

  return {
    unitId: unit.id,
    timestamp: new Date().toISOString(),
    cpuUsage: cpu,
    ramUsage,
    ramTotal: unit.ramTotal,
    ramPercentage,
    uptime: unit.uptime,
    temperature,
    networkLatency,
    status,
    eventCode,
    eventMessage,
    metadata: {
      firmwareVersion: 'v3.1.2-edge',
      region: 'us-west-edge-cluster',
      clientIp: '192.168.10.' + (100 + FLEET_UNITS.indexOf(unit)),
    },
  };
}

/**
 * Transmit telemetry packet to backend ingestion API via Axios
 */
async function sendTelemetryBatch() {
  cycleCount++;
  // Rotate through units or send a packet for each unit
  const activeUnitIndex = (cycleCount - 1) % FLEET_UNITS.length;
  const targetUnit = FLEET_UNITS[activeUnitIndex];
  const packet = generateTelemetryPacket(targetUnit);

  const tStart = Date.now();

  try {
    const response = await axios.post(TARGET_URL, packet, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Telemetry-Edge-Client/1.0',
      },
      timeout: 5000,
    });

    const elapsed = Date.now() - tStart;
    const timeStr = new Date().toLocaleTimeString();

    const statusBadge =
      packet.status === 'CRITICAL'
        ? '🔴 CRITICAL'
        : packet.status === 'WARNING'
        ? '🟡 WARNING '
        : '🟢 ONLINE  ';

    console.log(
      `[${timeStr}] Cycle #${String(cycleCount).padStart(4, '0')} | ` +
      `${packet.unitId.padEnd(14)} | ${statusBadge} | ` +
      `CPU: ${String(packet.cpuUsage).padStart(2)}% | ` +
      `RAM: ${packet.ramPercentage}% (${packet.ramUsage}MB) | ` +
      `Temp: ${packet.temperature}°C | ` +
      `Code: ${packet.eventCode.padEnd(20)} | ` +
      `HTTP ${response.status} (${elapsed}ms) [${response.data.dbMode || 'ok'}]`
    );
  } catch (err) {
    const elapsed = Date.now() - tStart;
    const timeStr = new Date().toLocaleTimeString();
    if (err.response) {
      console.error(
        `[${timeStr}] ❌ Transmission Rejected: HTTP ${err.response.status} - ${JSON.stringify(
          err.response.data
        )} (${elapsed}ms)`
      );
    } else if (err.code === 'ECONNREFUSED') {
      console.error(
        `[${timeStr}] ⚠️ Connection Refused at ${TARGET_URL}. Is the backend server running? (npm run dev)`
      );
    } else {
      console.error(`[${timeStr}] ❌ Ingestion Request Failed: ${err.message}`);
    }
  }
}

// Initial transmission immediately
sendTelemetryBatch();

// Continuous transmission every 3 seconds
const intervalId = setInterval(sendTelemetryBatch, INTERVAL_MS);

// Handle graceful termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Telemetry Simulator gracefully...');
  clearInterval(intervalId);
  process.exit(0);
});
