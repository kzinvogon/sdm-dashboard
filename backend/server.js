const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = config.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Define schemas based on your dashboard structure
const bidSchema = new mongoose.Schema({
  id: String,
  customer: String,
  title: String,
  primary_skill: String,
  stage: String,
  csm: String,
  close_at: Date,
  invites_sent: Number,
  responses: Number,
  best_price: Number,
  best_score: Number,
  last_update: Date,
  region: String,
  budget_band: String
}, { collection: 'bids' });

const expertSchema = new mongoose.Schema({
  id: String,
  name: String,
  category: String,
  skills: [String],
  tz: String,
  utilization: Number,
  available: Boolean,
  rating: Number,
  last_active: Date,
  recent_bids: Number,
  wins: Number
}, { collection: 'experts' });

const projectSchema = new mongoose.Schema({
  id: String,
  customer: String,
  expert: String,
  start: Date,
  due: Date,
  status: String,
  escalations: Number
}, { collection: 'projects' });

// Create models
const Bid = mongoose.model('Bid', bidSchema);
const Expert = mongoose.model('Expert', expertSchema);
const Project = mongoose.model('Project', projectSchema);

// API Routes

// Get all bids
app.get('/api/bids', async (req, res) => {
  try {
    const bids = await Bid.find({});
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bids by stage
app.get('/api/bids/stage/:stage', async (req, res) => {
  try {
    const { stage } = req.params;
    const bids = await Bid.find({ stage });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all experts
app.get('/api/experts', async (req, res) => {
  try {
    const experts = await Expert.find({});
    res.json(experts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({});
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard KPIs
app.get('/api/dashboard/kpis', async (req, res) => {
  try {
    const [bids, experts, projects] = await Promise.all([
      Bid.find({}),
      Expert.find({}),
      Project.find({})
    ]);

    // Calculate KPIs
    const bidsByStage = {};
    bids.forEach(bid => {
      bidsByStage[bid.stage] = (bidsByStage[bid.stage] || 0) + 1;
    });

    const activeExperts = experts.filter(e => e.recent_bids > 0 || 
      projects.some(p => p.expert === e.name && ['Active', 'Escalated'].includes(p.status))
    ).length;

    const responseRate = bids.reduce((acc, b) => acc + b.invites_sent, 0) > 0 
      ? Math.round((bids.reduce((acc, b) => acc + b.responses, 0) / bids.reduce((acc, b) => acc + b.invites_sent, 0)) * 100)
      : 0;

    const closingSoon = bids.filter(b => 
      ['Invited', 'Bidding', 'Clarification'].includes(b.stage) && 
      (new Date(b.close_at) - new Date()) <= 24 * 3600 * 1000 && 
      (new Date(b.close_at) - new Date()) > 0
    ).length;

    const unresponded = bids.filter(b => b.responses === 0).length;

    res.json({
      bidsByStage,
      activeExperts,
      idleExperts: experts.length - activeExperts,
      responseRate,
      closingSoon,
      unresponded,
      totalBids: bids.length,
      totalExperts: experts.length,
      totalProjects: projects.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
});
