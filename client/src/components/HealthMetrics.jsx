import React from 'react';

export default function HealthMetrics({ stats = {} }) {
  const {
    totalUnits = 0,
    onlineUnits = 0,
    warningUnits = 0,
    criticalUnits = 0,
    averageCpu = 0,
    averageRam = 0,
    healthScore = 100,
    activeAlertsCount = 0,
  } = stats;

  const healthColor =
    healthScore > 85 ? 'var(--accent-green)' : healthScore > 65 ? 'var(--accent-amber)' : 'var(--accent-crimson)';

  const cpuColor =
    averageCpu > 80 ? 'var(--accent-crimson)' : averageCpu > 65 ? 'var(--accent-amber)' : 'var(--accent-cyan)';

  const ramColor =
    averageRam > 80 ? 'var(--accent-crimson)' : averageRam > 65 ? 'var(--accent-amber)' : 'var(--accent-blue)';

  return (
    <section className="metrics-grid">
      {/* 1. Fleet Health Index */}
      <div className="metric-card" style={{ '--card-accent': healthColor }}>
        <div className="metric-header">
          <span className="metric-title">Fleet Health Index</span>
          <div className="metric-icon" style={{ '--metric-color': healthColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-value" style={{ color: healthColor }}>
            {healthScore}%
          </span>
          <span className="metric-unit">
            {healthScore > 85 ? 'OPTIMAL' : healthScore > 65 ? 'DEGRADED' : 'CRITICAL'}
          </span>
        </div>
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{ width: `${healthScore}%`, background: healthColor }}
          />
        </div>
        <div className="metric-footer">
          <span>{criticalUnits} Critical</span>
          <span>{warningUnits} Degraded</span>
        </div>
      </div>

      {/* 2. Automation Units Status */}
      <div className="metric-card" style={{ '--card-accent': 'var(--gradient-neon)' }}>
        <div className="metric-header">
          <span className="metric-title">Active Fleet Units</span>
          <div className="metric-icon" style={{ '--metric-color': 'var(--accent-cyan)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{onlineUnits}</span>
          <span className="metric-unit">/ {totalUnits || 5} ONLINE</span>
        </div>
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{
              width: `${totalUnits ? (onlineUnits / totalUnits) * 100 : 100}%`,
              background: 'var(--gradient-neon)',
            }}
          />
        </div>
        <div className="metric-footer">
          <span>Stream Ingestion Active</span>
          <span>100% Target Coverage</span>
        </div>
      </div>

      {/* 3. Fleet Average CPU Load */}
      <div className="metric-card" style={{ '--card-accent': cpuColor }}>
        <div className="metric-header">
          <span className="metric-title">Avg CPU Utilization</span>
          <div className="metric-icon" style={{ '--metric-color': cpuColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="15" x2="23" y2="15" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="15" x2="4" y2="15" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{averageCpu}%</span>
          <span className="metric-unit">ALLOCATION</span>
        </div>
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(100, averageCpu)}%`, background: cpuColor }}
          />
        </div>
        <div className="metric-footer">
          <span>Target: &lt; 75.0%</span>
          <span>Peak: {Math.min(100, Math.round(averageCpu * 1.25))}%</span>
        </div>
      </div>

      {/* 4. Fleet Memory Load */}
      <div className="metric-card" style={{ '--card-accent': ramColor }}>
        <div className="metric-header">
          <span className="metric-title">Avg Memory Consumption</span>
          <div className="metric-icon" style={{ '--metric-color': ramColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 19v-3" />
              <path d="M10 19v-3" />
              <path d="M14 19v-3" />
              <path d="M18 19v-3" />
              <path d="M6 8V5" />
              <path d="M10 8V5" />
              <path d="M14 8V5" />
              <path d="M18 8V5" />
              <rect x="2" y="8" width="20" height="8" rx="2" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-value">{averageRam}%</span>
          <span className="metric-unit">OF RAM</span>
        </div>
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(100, averageRam)}%`, background: ramColor }}
          />
        </div>
        <div className="metric-footer">
          <span>Capacity: High-Density</span>
          <span>Pressure: Nominal</span>
        </div>
      </div>

      {/* 5. Active Error & Event Alerts */}
      <div className="metric-card" style={{ '--card-accent': activeAlertsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
        <div className="metric-header">
          <span className="metric-title">Active Anomalies</span>
          <div className="metric-icon" style={{ '--metric-color': activeAlertsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>
        <div className="metric-value-row">
          <span className="metric-value" style={{ color: activeAlertsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
            {activeAlertsCount}
          </span>
          <span className="metric-unit">UNRESOLVED</span>
        </div>
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{
              width: `${Math.min(100, activeAlertsCount * 15)}%`,
              background: activeAlertsCount > 0 ? 'var(--accent-amber)' : 'var(--accent-green)',
            }}
          />
        </div>
        <div className="metric-footer">
          <span>{criticalUnits} Critical Urgency</span>
          <span>Auto-Triage Active</span>
        </div>
      </div>
    </section>
  );
}
