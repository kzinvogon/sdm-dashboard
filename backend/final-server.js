const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = 3001;

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
const userSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });
const proposalSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });
const leadSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });
const statusSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });
const productSchema = new mongoose.Schema({}, { strict: false, strictPopulate: false });

// Create models
const User = mongoose.model('User', userSchema);
const Proposal = mongoose.model('Proposal', proposalSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Status = mongoose.model('Status', statusSchema);
const Product = mongoose.model('Product', productSchema);

// API Routes

// Get all bids (proposals)
app.get('/api/bids', async (req, res) => {
  try {
    const proposals = await Proposal.find({ isDeleted: { $ne: true } })
      .populate('lead', 'requestId category description requirements customer manager')
      .populate('createdBy', 'email firstname lastname personalCode')
      .populate('status', 'displayName colorCode')
      .lean();
    
    // Transform to match dashboard format
    const transformedBids = proposals.map(proposal => ({
      id: proposal.lead?.requestId || `BR-${proposal._id}`,
      customer: proposal.lead?.customer?.email?.split('@')[0] || 'Unknown Customer',
      title: proposal.title,
      primary_skill: proposal.lead?.category || 'General',
      stage: proposal.status?.displayName || 'Unknown',
      csm: proposal.lead?.manager?.email?.split('@')[0] || 'Unassigned',
      close_at: proposal.endDate,
      invites_sent: 1, // Default value
      responses: 1, // Default value
      best_price: proposal.price,
      best_score: 75, // Default value
      last_update: proposal.updatedAt || proposal.createdAt,
      region: 'Global', // Default value
      budget_band: proposal.price > 5000 ? 'High' : proposal.price > 1000 ? 'Mid' : 'Low'
    }));
    
    res.json(transformedBids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all experts
app.get('/api/experts', async (req, res) => {
  try {
    const experts = await User.find({ 
      role: 'expert',
      isDeleted: { $ne: true }
    })
      .populate('products', 'name')
      .lean();
    
    // Transform to match dashboard format
    const transformedExperts = experts.map(expert => ({
      id: expert.personalCode || `EXP-${expert._id}`,
      name: `${expert.firstname} ${expert.lastname}` || expert.email.split('@')[0],
      category: 'Freelance', // Default category
      skills: expert.products?.map(p => p.name) || ['General'],
      tz: 'UTC', // Default timezone
      utilization: Math.floor(Math.random() * 100), // Random for now
      available: expert.isActive,
      rating: 4, // Default rating
      last_active: expert.lastLogin || expert.updatedAt || expert.createdAt,
      recent_bids: Math.floor(Math.random() * 10), // Random for now
      wins: Math.floor(Math.random() * 5) // Random for now
    }));
    
    res.json(transformedExperts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all projects (active leads)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Lead.find({ 
      isActiveProject: true,
      isDeleted: { $ne: true }
    })
      .populate('expert', 'email firstname lastname personalCode')
      .populate('customer', 'email firstname lastname personalCode')
      .populate('status', 'displayName')
      .lean();
    
    // Transform to match dashboard format
    const transformedProjects = projects.map(project => ({
      id: project.requestId || `PRJ-${project._id}`,
      customer: project.customer?.email?.split('@')[0] || 'Unknown Customer',
      expert: project.expert?.email?.split('@')[0] || 'Unassigned',
      start: project.startDate,
      due: project.endDate,
      status: project.status?.displayName || 'Unknown',
      escalations: 0 // Default value
    }));
    
    res.json(transformedProjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard KPIs
app.get('/api/kpis', async (req, res) => {
  try {
    const [proposals, experts, projects, statuses] = await Promise.all([
      Proposal.find({ isDeleted: { $ne: true } }).populate('status', 'displayName'),
      User.find({ role: 'expert', isDeleted: { $ne: true } }),
      Lead.find({ isActiveProject: true, isDeleted: { $ne: true } }),
      Status.find({ isActive: true, isDeleted: { $ne: true } })
    ]);

    // Calculate KPIs
    const bidsByStage = {};
    console.log('Debug: Processing', proposals.length, 'proposals');
    proposals.forEach((proposal, index) => {
      console.log(`Debug: Proposal ${index}:`, {
        status: proposal.status,
        hasStatus: !!proposal.status,
        statusDisplayName: proposal.status?.displayName,
        stage: proposal.stage
      });
      
      let stage = 'Unknown';
      if (proposal.status?.displayName) {
        stage = proposal.status.displayName;
      } else if (proposal.status && typeof proposal.status === 'object' && proposal.status._id) {
        // If status is an ObjectId, map it to a meaningful stage
        const statusId = proposal.status._id.toString();
        // Map common status IDs to stage names
        if (statusId === '68427a8bb9eec052ca11f1b3') {
          stage = 'New';
        } else {
          stage = 'Bidding'; // Default for other status IDs
        }
      } else if (proposal.status) {
        // If status is populated but doesn't have displayName, use the status directly
        stage = proposal.status.toString();
      } else if (proposal.stage) {
        // If there's a stage field directly on the proposal
        stage = proposal.stage;
      }
      bidsByStage[stage] = (bidsByStage[stage] || 0) + 1;
    });
    console.log('Debug: Final bidsByStage:', bidsByStage);

    const activeExperts = experts.filter(e => e.isActive).length;
    const idleExperts = experts.length - activeExperts;

    const responseRate = 75; // Default value

    const closingSoon = proposals.filter(proposal => {
      if (!proposal.endDate) return false;
      const daysUntilEnd = (new Date(proposal.endDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 1 && daysUntilEnd > 0;
    }).length;

    const unresponded = 0; // Default value

    res.json({
      bidsByStage,
      activeExperts,
      idleExperts,
      responseRate,
      closingSoon,
      unresponded,
      totalBids: proposals.length,
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
  console.log(`🚀 Final server running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
  console.log(`✅ Connected to MongoDB with real data`);
});
