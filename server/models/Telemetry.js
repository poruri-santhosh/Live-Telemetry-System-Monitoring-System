const mongoose = require('mongoose');

/**
 * Mongoose Schema optimized for high-frequency time-stamped telemetry logs.
 * Includes compound indexing for rapid time-series retrieval and TTL indexing.
 */
const TelemetrySchema = new mongoose.Schema(
  {
    unitId: {
      type: String,
      required: [true, 'unitId is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    cpuUsage: {
      type: Number,
      required: [true, 'cpuUsage percentage is required'],
      min: 0,
      max: 100,
    },
    ramUsage: {
      type: Number,
      required: [true, 'ramUsage is required'],
      min: 0,
    },
    ramTotal: {
      type: Number,
      default: 16384, // 16 GB default
    },
    ramPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    uptime: {
      type: Number,
      required: [true, 'uptime in seconds is required'],
      min: 0,
    },
    temperature: {
      type: Number,
      default: 45.0, // °C
    },
    networkLatency: {
      type: Number,
      default: 12.0, // ms
    },
    status: {
      type: String,
      enum: ['ONLINE', 'WARNING', 'CRITICAL', 'DEGRADED'],
      default: 'ONLINE',
      index: true,
    },
    eventCode: {
      type: String,
      default: 'SYS_OK_200',
      trim: true,
      index: true,
    },
    eventMessage: {
      type: String,
      default: 'Normal operational parameters',
    },
    metadata: {
      firmwareVersion: { type: String, default: 'v2.4.1' },
      region: { type: String, default: 'us-east' },
      clientIp: { type: String, default: '127.0.0.1' },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Auto calculate ramPercentage before saving if not supplied
TelemetrySchema.pre('save', function (next) {
  if (this.ramUsage && this.ramTotal && !this.ramPercentage) {
    this.ramPercentage = Number(((this.ramUsage / this.ramTotal) * 100).toFixed(2));
  }
  // Auto determine status based on metrics if default
  if (this.cpuUsage > 90 || this.temperature > 85) {
    this.status = 'CRITICAL';
  } else if (this.cpuUsage > 75 || this.temperature > 70) {
    this.status = 'WARNING';
  }
  next();
});

/* =========================================================================
   PERFORMANCE INDEXES
   ========================================================================= */

// 1. Compound Index: Unit + Timestamp (Crucial for querying time-series metrics per client unit)
TelemetrySchema.index({ unitId: 1, timestamp: -1 });

// 2. Global Timestamp Index: Crucial for fleet-wide real-time dashboard snapshots
TelemetrySchema.index({ timestamp: -1 });

// 3. Compound Index for Alert/Error Filtering
TelemetrySchema.index({ eventCode: 1, timestamp: -1 });

// 4. Status + Timestamp Index: Filter critical/warning events quickly
TelemetrySchema.index({ status: 1, timestamp: -1 });

// 5. TTL Index (Time-To-Live): Automatically remove data older than 7 days (604800 seconds)
// Keeps database storage lean and prevents performance degradation over time
TelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

// Export Mongoose Model (re-use if already compiled in serverless environment)
module.exports = mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);
