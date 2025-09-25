const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = 3002; // Different port to avoid conflicts

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

// Debug endpoints to see what's actually in your database
app.get('/api/debug/collections', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    res.json({
      message: 'Available collections in your database:',
      collections: collections.map(c => c.name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/users', async (req, res) => {
  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({}).limit(5).lean();
    res.json({
      message: 'Sample users from your database:',
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/proposals', async (req, res) => {
  try {
    const Proposal = mongoose.model('Proposal', new mongoose.Schema({}, { strict: false }));
    const proposals = await Proposal.find({}).limit(5).lean();
    res.json({
      message: 'Sample proposals from your database:',
      count: proposals.length,
      proposals: proposals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/leads', async (req, res) => {
  try {
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
    const leads = await Lead.find({}).limit(5).lean();
    res.json({
      message: 'Sample leads from your database:',
      count: leads.length,
      leads: leads
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/statuses', async (req, res) => {
  try {
    const Status = mongoose.model('Status', new mongoose.Schema({}, { strict: false }));
    const statuses = await Status.find({}).limit(5).lean();
    res.json({
      message: 'Sample statuses from your database:',
      count: statuses.length,
      statuses: statuses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔍 Debug server running on port ${PORT}`);
  console.log(`📊 Debug API: http://localhost:${PORT}/api/debug`);
});
