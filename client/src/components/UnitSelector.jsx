import React from 'react';

export default function UnitSelector({ units = [], selectedUnit = 'ALL', onSelectUnit }) {
  // Format uptime in hours and minutes
  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div className="panel-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 className="panel-title">Remote Automation Fleet Units</h2>
          <p className="panel-subtitle">Select a unit to isolate its real-time telemetry channel</p>
        </div>

        <button
          className={`btn ${selectedUnit === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelectUnit('ALL')}
          style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
        >
          View All Units ({units.length})
        </button>
      </div>

      <div className="units-grid">
        {units.map((unit) => {
          const isSelected = selectedUnit === unit.unitId;
          const statusClass =
            unit.status === 'CRITICAL' ? 'critical' : unit.status === 'WARNING' ? 'warning' : 'online';

          return (
            <div
              key={unit.unitId}
              className={`unit-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectUnit(unit.unitId)}
            >
              <div className="unit-card-header">
                <div className="unit-id-badge">
                  <span className={`pulse-dot ${statusClass}`}></span>
                  <span>{unit.unitId}</span>
                </div>
                <span className={`unit-status-pill ${statusClass}`}>{unit.status}</span>
              </div>

              <div className="unit-metrics-row">
                <div className="unit-mini-stat">
                  <span className="unit-mini-stat-label">CPU LOAD</span>
                  <span
                    className="unit-mini-stat-value"
                    style={{
                      color:
                        unit.cpuUsage > 80
                          ? 'var(--accent-crimson)'
                          : unit.cpuUsage > 60
                          ? 'var(--accent-amber)'
                          : 'var(--accent-cyan)',
                    }}
                  >
                    {unit.cpuUsage}%
                  </span>
                </div>

                <div className="unit-mini-stat">
                  <span className="unit-mini-stat-label">TEMP</span>
                  <span
                    className="unit-mini-stat-value"
                    style={{
                      color:
                        unit.temperature > 80
                          ? 'var(--accent-crimson)'
                          : unit.temperature > 65
                          ? 'var(--accent-amber)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {unit.temperature}°C
                  </span>
                </div>

                <div className="unit-mini-stat">
                  <span className="unit-mini-stat-label">UPTIME</span>
                  <span className="unit-mini-stat-value">{formatUptime(unit.uptime)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
