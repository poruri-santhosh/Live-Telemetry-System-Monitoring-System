import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import HealthMetrics from './components/HealthMetrics';
import TelemetryChart from './components/TelemetryChart';
import UnitSelector from './components/UnitSelector';
import AlertsFeed from './components/AlertsFeed';
import SimulatorPanel from './components/SimulatorPanel';
import {
  fetchTelemetry,
  fetchFleetStats,
  fetchUnits,
  ingestMockBatch,
  subscribeToStream,
} from './services/api';
import './styles/dashboard.css';

export default function App() {
  const [packets, setPackets] = useState([]);
  const [stats, setStats] = useState({});
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [dbMode, setDbMode] = useState('mongodb');
  const [isInjecting, setIsInjecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Initial load and periodic refresh
  const loadData = useCallback(async () => {
    try {
      const [telemetryRes, statsRes, unitsRes] = await Promise.all([
        fetchTelemetry({ unitId: selectedUnit, limit: 50 }),
        fetchFleetStats(),
        fetchUnits(),
      ]);

      if (telemetryRes.data) {
        setPackets(telemetryRes.data);
        if (telemetryRes.dbMode) setDbMode(telemetryRes.dbMode);
      }
      if (statsRes.stats) {
        setStats(statsRes.stats);
        if (statsRes.dbMode) setDbMode(statsRes.dbMode);
      }
      if (unitsRes.units) {
        setUnits(unitsRes.units);
      }
      setLastUpdated(Date.now());
    } catch (err) {
      console.warn('[Telemetry Load Error]:', err.message);
    }
  }, [selectedUnit]);

  // Initial fetch and automatic sync polling
  useEffect(() => {
    loadData();

    if (!isLiveStreaming) return;

    // Fast sync interval every 3 seconds
    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadData, isLiveStreaming]);

  // Subscribe to real-time Server-Sent Events (SSE)
  useEffect(() => {
    if (!isLiveStreaming) return;

    const unsubscribe = subscribeToStream((newPacket) => {
      setPackets((prev) => {
        // Prevent duplicate IDs
        if (prev.some((p) => (p._id && p._id === newPacket._id) || (p.timestamp === newPacket.timestamp && p.unitId === newPacket.unitId))) {
          return prev;
        }
        return [newPacket, ...prev.slice(0, 99)];
      });
      setLastUpdated(Date.now());
    });

    return () => unsubscribe();
  }, [isLiveStreaming]);

  // Manual trigger for mock batch injection
  const handleInjectMock = async () => {
    setIsInjecting(true);
    try {
      await ingestMockBatch();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsInjecting(false);
    }
  };

  // Extract alerts from recent packets and stats
  const activeAlerts = (packets || []).filter(
    (p) => p.status === 'CRITICAL' || p.status === 'WARNING'
  );

  return (
    <div className="app-container">
      {/* 1. Header with System Badges and Controls */}
      <Header
        dbMode={dbMode}
        isLiveStreaming={isLiveStreaming}
        onToggleStream={() => setIsLiveStreaming((s) => !s)}
        onInjectMock={handleInjectMock}
        isInjecting={isInjecting}
        lastUpdated={lastUpdated}
      />

      {/* 2. Operational Health Metric Status Cards */}
      <HealthMetrics stats={stats} />

      {/* 3. Remote Automation Units Selector & Fleet Node Indicators */}
      <UnitSelector
        units={units}
        selectedUnit={selectedUnit}
        onSelectUnit={setSelectedUnit}
      />

      {/* 4. Main Telemetry Grid: Chart (Left) + Error Alerts Feed (Right) */}
      <main className="dashboard-main-grid">
        <TelemetryChart packets={packets} selectedUnit={selectedUnit} />
        <AlertsFeed alerts={activeAlerts} />
      </main>

      {/* 5. In-Browser Fleet Simulator Control Dock */}
      <SimulatorPanel onPacketsIngested={loadData} />
    </div>
  );
}
