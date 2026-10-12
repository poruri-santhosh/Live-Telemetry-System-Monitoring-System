import React, { useState, useEffect } from 'react';
import { ingestMockBatch } from '../services/api';

export default function SimulatorPanel({ onPacketsIngested }) {
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simCycles, setSimCycles] = useState(0);

  useEffect(() => {
    let intervalId = null;

    if (isAutoSimulating) {
      // Send mock batch immediately
      ingestMockBatch()
        .then(() => {
          setSimCycles((c) => c + 1);
          if (onPacketsIngested) onPacketsIngested();
        })
        .catch(console.error);

      // Repeat every 3 seconds (as requested in specifications)
      intervalId = setInterval(() => {
        ingestMockBatch()
          .then(() => {
            setSimCycles((c) => c + 1);
            if (onPacketsIngested) onPacketsIngested();
          })
          .catch(console.error);
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoSimulating, onPacketsIngested]);

  return (
    <div className="simulator-dock">
      <div className="simulator-info">
        <div className="simulator-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div>
          <h3 className="simulator-title">Edge Fleet Ingestion Simulator</h3>
          <p className="simulator-desc">
            {isAutoSimulating
              ? `⚡ Active: Transmitting simulated packets every 3.0s (Cycle #${simCycles})`
              : 'Mock client streaming via API. Or run in terminal: npm run simulate'}
          </p>
        </div>
      </div>

      <div className="simulator-actions">
        <button
          className={`btn ${isAutoSimulating ? 'btn-active' : 'btn-primary'}`}
          onClick={() => setIsAutoSimulating(!isAutoSimulating)}
        >
          {isAutoSimulating ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Stop Browser Simulator
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Browser Simulator (3s Loop)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
