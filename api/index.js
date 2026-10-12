// Vercel Serverless Function entry point
// Bridges Vercel serverless requests into the Express application
const app = require('../server/server');

module.exports = app;
