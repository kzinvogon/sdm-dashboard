const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'SDM Dashboard API is running'
  });
});

// Mock data endpoints (for now)
app.get('/api/bids', (req, res) => {
  res.json([
    { id: 'BR-1001', customer: 'Acme Ltd', title: 'Azure Migration', stage: 'Bidding', responses: 3 },
    { id: 'BR-1002', customer: 'Bleckmann', title: 'Magento Upgrade', stage: 'Invited', responses: 1 },
    { id: 'BR-1003', customer: 'Contoso', title: 'Security Audit', stage: 'New', responses: 0 }
  ]);
});

app.get('/api/experts', (req, res) => {
  res.json([
    { id: 'EXP-501', name: 'Ana Ruiz', category: 'Freelance', utilization: 75, available: true },
    { id: 'EXP-502', name: 'Bob Lee', category: 'Partner', utilization: 60, available: true },
    { id: 'EXP-503', name: 'Chen Wu', category: 'FTE', utilization: 90, available: false }
  ]);
});

app.get('/api/projects', (req, res) => {
  res.json([
    { id: 'PRJ-801', customer: 'Acme Ltd', expert: 'Ana Ruiz', status: 'Active', escalations: 0 },
    { id: 'PRJ-802', customer: 'Bleckmann', expert: 'Bob Lee', status: 'Completed', escalations: 1 },
    { id: 'PRJ-803', customer: 'Contoso', expert: 'Chen Wu', status: 'Blocked', escalations: 2 }
  ]);
});

// Dashboard KPIs
app.get('/api/dashboard/kpis', (req, res) => {
  res.json({
    bidsByStage: {
      'New': 5,
      'Invited': 8,
      'Bidding': 12,
      'Clarification': 3,
      'Closing Soon': 2,
      'Closed': 10
    },
    activeExperts: 15,
    idleExperts: 5,
    responseRate: 75,
    closingSoon: 2,
    unresponded: 3,
    totalBids: 40,
    totalExperts: 20,
    totalProjects: 14
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
  console.log(`✅ Ready to serve data!`);
});
