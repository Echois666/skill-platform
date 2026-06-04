const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Load data
const parks = require('../data/parks.json');
const salesPhases = require('../data/sales-phases.json');

// Routes
app.get('/api/parks', (req, res) => {
  res.json(parks);
});

app.get('/api/parks/:id', (req, res) => {
  const park = parks.find(p => p.id === req.params.id);
  if (park) {
    res.json(park);
  } else {
    res.status(404).json({ error: 'Park not found' });
  }
});

app.get('/api/sales-phases', (req, res) => {
  res.json(salesPhases);
});

app.get('/api/parks/:id/timeline', (req, res) => {
  const park = parks.find(p => p.id === req.params.id);
  if (park) {
    res.json({ parkId: park.id, timeline: salesPhases.timelineTemplate });
  } else {
    res.status(404).json({ error: 'Park not found' });
  }
});

app.post('/api/generate/solution', (req, res) => {
  const { parkId, type, version } = req.body;
  res.json({ status: 'success', file: `solution-${parkId}-${version}.docx`, size: '2.5MB' });
});

app.post('/api/generate/ppt', (req, res) => {
  const { parkId, type, version } = req.body;
  res.json({ status: 'success', file: `presentation-${parkId}-${version}.pptx`, size: '5.2MB' });
});

app.post('/api/generate/complete-package', (req, res) => {
  const { parkId, version } = req.body;
  res.json({ status: 'success', files: ['solution.docx', 'presentation.pptx', 'plan.xlsx'], totalSize: '8.7MB' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});