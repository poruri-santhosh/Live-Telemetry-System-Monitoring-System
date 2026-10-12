import React from 'react';

export default function Header({
  dbMode,
  isLiveStreaming,
  onToggleStream,
  onInjectMock,
  isInjecting,
  lastUpdated,
}) {
  return (
    <header className="header-container">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <h1 className="brand-title">
            AEGIS TELEMETRY
            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              LIVE v2.4
            </span>
          </h1>
          <p className="brand-subtitle">
            Remote Automation & Fleet Telemetry Ingestion Hub
          </p>
        </div>
      </div>

      <div className="header-controls">
        {/* Database Status Badge */}
        <div className="status-badge" title="Database ingestion persistence target">
          <span className={`pulse-dot ${dbMode === 'mongodb' ? 'online' : 'warning'}`}></span>
          <span>DB: {dbMode === 'mongodb' ? 'MongoDB Atlas' : 'In-Memory Buffer'}</span>
        </div>

        {/* Real-time Stream Status */}
        <div className="status-badge" title="SSE & Real-Time Sync Status">
          <span className={`pulse-dot ${isLiveStreaming ? 'online' : 'warning'}`}></span>
          <span>{isLiveStreaming ? 'LIVE SYNC ACTIVE' : 'STREAM PAUSED'}</span>
        </div>

        {/* Stream Toggle */}
        <button
          className={`btn ${isLiveStreaming ? 'btn-secondary' : 'btn-primary'}`}
          onClick={onToggleStream}
          title="Toggle live telemetry updates"
        >
          {isLiveStreaming ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Pause Stream
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Resume Stream
            </>
          )}
        </button>

        {/* Manual Inject Mock Data */}
        <button
          className="btn btn-primary"
          onClick={onInjectMock}
          disabled={isInjecting}
          title="Simulate immediate incoming client packet batch"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {isInjecting ? 'Ingesting...' : 'Inject Packets'}
        </button>
      </div>
    </header>
  );
}
