/**
 * Telemetry API Client Service
 */

const API_BASE = '/api/telemetry';

export async function fetchTelemetry({ unitId = 'ALL', limit = 40 } = {}) {
  const params = new URLSearchParams();
  if (unitId && unitId !== 'ALL') params.append('unitId', unitId);
  if (limit) params.append('limit', limit);

  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch telemetry: ${res.statusText}`);
  return res.json();
}

export async function fetchFleetStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Failed to fetch fleet stats: ${res.statusText}`);
  return res.json();
}

export async function fetchUnits() {
  const res = await fetch(`${API_BASE}/units`);
  if (!res.ok) throw new Error(`Failed to fetch units: ${res.statusText}`);
  return res.json();
}

export async function ingestMockBatch() {
  const res = await fetch(`${API_BASE}/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to inject mock batch: ${res.statusText}`);
  return res.json();
}

export async function ingestPacket(packet) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(packet),
  });
  if (!res.ok) throw new Error(`Failed to ingest packet: ${res.statusText}`);
  return res.json();
}

/**
 * Connect to SSE live stream for real-time telemetry packets
 */
export function subscribeToStream(onPacket, onError) {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const sse = new EventSource(`${API_BASE}/stream`);

  sse.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.unitId) {
        onPacket(data);
      }
    } catch {
      // Ignored heartbeat or text message
    }
  };

  sse.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    sse.close();
  };
}
