import React, { useState } from 'react';

export default function AlertsFeed({ alerts = [] }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CRITICAL', 'WARNING'

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Active Error & Incident Log</h2>
          <p className="panel-subtitle">Real-time telemetry event triage</p>
        </div>

        <div className="chart-controls">
          <button
            className={`chart-tab-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({alerts.length})
          </button>
          <button
            className={`chart-tab-btn ${filter === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setFilter('CRITICAL')}
          >
            Crit
          </button>
          <button
            className={`chart-tab-btn ${filter === 'WARNING' ? 'active' : ''}`}
            onClick={() => setFilter('WARNING')}
          >
            Warn
          </button>
        </div>
      </div>

      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <svg
              className="empty-state-icon"
              style={{ color: 'var(--accent-green)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p style={{ color: 'var(--text-secondary)' }}>No active incidents reported</p>
            <span style={{ fontSize: '0.74rem' }}>All remote automation units operating within nominal bounds.</span>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const isCrit = alert.status === 'CRITICAL';
            const alertClass = isCrit ? 'critical' : 'warning';

            return (
              <div key={alert._id || idx} className={`alert-item ${alertClass}`}>
                <div className="alert-icon">
                  {isCrit ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-crimson)" strokeWidth="2.2">
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2.2">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                </div>

                <div className="alert-content">
                  <div className="alert-top">
                    <span className={`alert-code ${alertClass}`}>{alert.eventCode || 'EVENT_ALERT'}</span>
                    <span className="alert-time">
                      {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="alert-message">{alert.eventMessage || 'Telemetry threshold exceeded'}</p>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="alert-unit-tag">{alert.unitId}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      CPU: {alert.cpuUsage}% | Temp: {alert.temperature}°C
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
