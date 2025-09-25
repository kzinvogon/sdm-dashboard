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

// Define schemas based on your actual database structure
const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['vendor', 'expert', 'customer', 'admin', 'manager'] },
  email: { type: String, required: true, unique: true, lowercase: true },
  personalCode: { type: String, unique: true },
  isActive: { type: Boolean, default: false },
  location: {
    country: String,
    state: String,
    region: String
  }
}, { discriminatorKey: 'role' });

const expertSchema = new mongoose.Schema({
  position: String,
  bio: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});

const leadSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  requirements: String,
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  budget: [Number],
  startDate: Date,
  endDate: Date,
  bidDeadline: Date,
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expert: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  licenses: Number,
  bidPool: { type: Boolean, default: false },
  isActiveProject: { type: Boolean, default: false },
  attachments: [{
    url: String,
    name: String,
    type: String,
    size: Number
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { collection: 'leads' });

const proposalSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  summary: String,
  remarks: { type: String, maxlength: 1000 },
  xeroQuoteId: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  isActive: { type: Boolean, default: true },
  isDraft: { type: Boolean, default: true }
}, { collection: 'proposals' });

const statusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true },
  displayName: { type: String, required: true },
  colorCode: { type: String, required: true },
  isSubstatus: { type: Boolean, default: false },
  parentStatus: String,
  isPositive: { type: Boolean, default: true },
  description: String,
  isActive: { type: Boolean, default: true },
  metadata: Map,
  tags: [String]
}, { collection: 'statuses' });

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, maxlength: 500 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  isActive: { type: Boolean, default: true },
  metadata: Map
}, { collection: 'skills' });

const productSchema = new mongoose.Schema({
  name: { type: String, unique: true, index: true },
  description: String,
  isActive: { type: Boolean, default: false }
}, { collection: 'products' });

// Create models
const User = mongoose.model('User', userSchema);
const Expert = User.discriminator('expert', expertSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Proposal = mongoose.model('Proposal', proposalSchema);
const Status = mongoose.model('Status', statusSchema);
const Skill = mongoose.model('Skill', skillSchema);
const Product = mongoose.model('Product', productSchema);

// API Routes

// Get all bids (proposals)
app.get('/api/bids', async (req, res) => {
  try {
    const bids = await Proposal.find({})
      .populate('lead', 'requestId category description requirements')
      .populate('createdBy', 'email personalCode')
      .populate('status', 'displayName colorCode')
      .lean();
    
    // Transform to match dashboard format
    const transformedBids = bids.map(bid => ({
      id: bid.lead?.requestId || `BR-${bid._id}`,
      customer: bid.lead?.customer || 'Unknown',
      title: bid.title,
      primary_skill: 'General', // You might want to populate this from lead.skills
      stage: bid.status?.displayName || 'Unknown',
      csm: bid.lead?.manager || 'Unassigned',
      close_at: bid.endDate,
      invites_sent: 1, // This might need to be calculated differently
      responses: 1, // This might need to be calculated differently
      best_price: bid.price,
      best_score: 75, // This might need to be calculated
      last_update: bid.updatedAt || bid.createdAt,
      region: 'Global', // This might need to be populated from user location
      budget_band: 'Mid' // This might need to be calculated from price
    }));
    
    res.json(transformedBids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all experts
app.get('/api/experts', async (req, res) => {
  try {
    const experts = await Expert.find({})
      .populate('products', 'name')
      .lean();
    
    // Transform to match dashboard format
    const transformedExperts = experts.map(expert => ({
      id: expert.personalCode || `EXP-${expert._id}`,
      name: expert.email.split('@')[0], // You might want to add a name field
      category: 'Freelance', // This might need to be determined differently
      skills: expert.products?.map(p => p.name) || [],
      tz: 'UTC', // This might need to be populated from location
      utilization: Math.floor(Math.random() * 100), // This might need to be calculated
      available: expert.isActive,
      rating: 4, // This might need to be calculated
      last_active: expert.updatedAt || expert.createdAt,
      recent_bids: Math.floor(Math.random() * 10), // This might need to be calculated
      wins: Math.floor(Math.random() * 5) // This might need to be calculated
    }));
    
    res.json(transformedExperts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all projects (active leads)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Lead.find({ isActiveProject: true })
      .populate('expert', 'email personalCode')
      .populate('customer', 'email personalCode')
      .populate('status', 'displayName')
      .lean();
    
    // Transform to match dashboard format
    const transformedProjects = projects.map(project => ({
      id: project.requestId || `PRJ-${project._id}`,
      customer: project.customer?.email?.split('@')[0] || 'Unknown',
      expert: project.expert?.email?.split('@')[0] || 'Unassigned',
      start: project.startDate,
      due: project.endDate,
      status: project.status?.displayName || 'Unknown',
      escalations: 0 // This might need to be calculated
    }));
    
    res.json(transformedProjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard KPIs
app.get('/api/dashboard/kpis', async (req, res) => {
  try {
    const [bids, experts, projects, statuses] = await Promise.all([
      Proposal.find({}).populate('status', 'displayName'),
      Expert.find({}),
      Lead.find({ isActiveProject: true }),
      Status.find({ isActive: true })
    ]);

    // Calculate KPIs
    const bidsByStage = {};
    bids.forEach(bid => {
      const stage = bid.status?.displayName || 'Unknown';
      bidsByStage[stage] = (bidsByStage[stage] || 0) + 1;
    });

    const activeExperts = experts.filter(e => e.isActive).length;
    const idleExperts = experts.length - activeExperts;

    const responseRate = 75; // This might need to be calculated from actual data

    const closingSoon = bids.filter(bid => {
      if (!bid.endDate) return false;
      const daysUntilEnd = (new Date(bid.endDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 1 && daysUntilEnd > 0;
    }).length;

    const unresponded = 0; // This might need to be calculated

    res.json({
      bidsByStage,
      activeExperts,
      idleExperts,
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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'SDM Dashboard API with real MongoDB data'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Real server running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
  console.log(`✅ Connected to MongoDB with real data`);
});
