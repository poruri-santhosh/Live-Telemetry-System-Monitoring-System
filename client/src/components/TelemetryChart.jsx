import React, { useState, useMemo } from 'react';

export default function TelemetryChart({ packets = [], selectedUnit = 'ALL' }) {
  const [activeMetric, setActiveMetric] = useState('both'); // 'both', 'cpu', 'ram'
  const [hoverIndex, setHoverIndex] = useState(null);

  // Filter packets by selected unit if needed and sort ascending chronologically for charting
  const chartData = useMemo(() => {
    let list = [...packets];
    if (selectedUnit && selectedUnit !== 'ALL') {
      list = list.filter((p) => p.unitId === selectedUnit);
    }
    // Take the latest 30 points and order chronologically (left to right)
    return list.slice(0, 30).reverse();
  }, [packets, selectedUnit]);

  // Chart dimensions
  const width = 850;
  const height = 280;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Calculate coordinates
  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d, i) => {
      const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * innerWidth;
      const cpuY = padding.top + innerHeight - (Math.min(100, Math.max(0, d.cpuUsage || 0)) / 100) * innerHeight;
      const ramY = padding.top + innerHeight - (Math.min(100, Math.max(0, d.ramPercentage || (d.ramUsage / 16384) * 100)) / 100) * innerHeight;
      return { x, cpuY, ramY, data: d };
    });
  }, [chartData, innerWidth, innerHeight]);

  // Generate SVG paths
  const cpuPath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.cpuY}` : `${acc} L ${p.x} ${p.cpuY}`), '');
  }, [points]);

  const cpuAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = padding.top + innerHeight;
    return `${cpuPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [cpuPath, points, padding, innerHeight]);

  const ramPath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.ramY}` : `${acc} L ${p.x} ${p.ramY}`), '');
  }, [points]);

  const ramAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = padding.top + innerHeight;
    return `${ramPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [ramPath, points, padding, innerHeight]);

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <div>
            <h2 className="panel-title">Real-Time Performance Telemetry Stream</h2>
            <p className="panel-subtitle">
              {selectedUnit === 'ALL' ? 'Fleet Aggregated Timeline' : `Unit Inspection: ${selectedUnit}`}
              {chartData.length > 0 && ` (${chartData.length} packets synchronized)`}
            </p>
          </div>
        </div>

        <div className="chart-controls">
          <button
            className={`chart-tab-btn ${activeMetric === 'both' ? 'active' : ''}`}
            onClick={() => setActiveMetric('both')}
          >
            Dual View
          </button>
          <button
            className={`chart-tab-btn ${activeMetric === 'cpu' ? 'active' : ''}`}
            onClick={() => setActiveMetric('cpu')}
          >
            CPU %
          </button>
          <button
            className={`chart-tab-btn ${activeMetric === 'ram' ? 'active' : ''}`}
            onClick={() => setActiveMetric('ram')}
          >
            RAM %
          </button>
        </div>
      </div>

      <div className="chart-canvas-container">
        {chartData.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <p>Awaiting incoming telemetry packets...</p>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Start the simulator or click "Inject Packets" above to stream metrics.
            </span>
          </div>
        ) : (
          <svg
            className="chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* CPU Gradient */}
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
              </linearGradient>

              {/* RAM Gradient */}
              <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = padding.top + innerHeight - (val / 100) * innerHeight;
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    className="chart-grid-line"
                  />
                  <text x={padding.left - 10} y={y + 3} textAnchor="end" className="chart-axis-text">
                    {val}%
                  </text>
                </g>
              );
            })}

            {/* RAM Area & Line */}
            {(activeMetric === 'both' || activeMetric === 'ram') && (
              <>
                <path d={ramAreaPath} fill="url(#ramGradient)" />
                <path
                  d={ramPath}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* CPU Area & Line */}
            {(activeMetric === 'both' || activeMetric === 'cpu') && (
              <>
                <path d={cpuAreaPath} fill="url(#cpuGradient)" />
                <path
                  d={cpuPath}
                  fill="none"
                  stroke="#00f2fe"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0px 0px 6px rgba(0, 242, 254, 0.5))' }}
                />
              </>
            )}

            {/* Interactive Data Nodes & Hover Columns */}
            {points.map((p, i) => (
              <g key={i}>
                {/* Invisible hover capture bar */}
                <rect
                  x={p.x - innerWidth / points.length / 2}
                  y={padding.top}
                  width={innerWidth / points.length}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  style={{ cursor: 'crosshair' }}
                />

                {/* Visible Points */}
                {(activeMetric === 'both' || activeMetric === 'cpu') && (
                  <circle
                    cx={p.x}
                    cy={p.cpuY}
                    r={hoverIndex === i ? 5 : 3}
                    fill="#00f2fe"
                    stroke="#070b13"
                    strokeWidth="1.5"
                  />
                )}
                {(activeMetric === 'both' || activeMetric === 'ram') && (
                  <circle
                    cx={p.x}
                    cy={p.ramY}
                    r={hoverIndex === i ? 5 : 3}
                    fill="#c084fc"
                    stroke="#070b13"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            ))}

            {/* Hover Crosshair Guide */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={padding.top + innerHeight}
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeDasharray="3 3"
                />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Floating Hover Readout Info */}
      {hoveredPoint && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 1rem',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            boxShadow: 'var(--shadow-glow-cyan)',
          }}
        >
          <span>
            <strong>{hoveredPoint.data.unitId}</strong> &bull; {new Date(hoveredPoint.data.timestamp).toLocaleTimeString()}
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>
              CPU: <strong>{hoveredPoint.data.cpuUsage}%</strong>
            </span>
            <span style={{ color: '#c084fc' }}>
              RAM: <strong>{hoveredPoint.data.ramPercentage}% ({hoveredPoint.data.ramUsage}MB)</strong>
            </span>
            <span style={{ color: 'var(--accent-amber)' }}>
              Temp: <strong>{hoveredPoint.data.temperature}°C</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Latency: <strong>{hoveredPoint.data.networkLatency}ms</strong>
            </span>
          </div>
        </div>
      )}

      {/* Chart Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#00f2fe' }}></span>
          <span>CPU Utilization (%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#c084fc' }}></span>
          <span>RAM Consumption (%)</span>
        </div>
      </div>
    </div>
  );
}
