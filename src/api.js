// API service for fetching data from the backend
const API_BASE_URL = 'http://localhost:3002/api';

// Mock data for production deployment
const mockData = {
  bids: [
    { id: 'BR-1001', customer: 'Acme Corp', title: 'Tech Project', stage: 'Bidding', responses: 3, invites_sent: 5, close_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1002', customer: 'Global Inc', title: 'Training', stage: 'New', responses: 0, invites_sent: 2, close_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1003', customer: 'Startup Co', title: 'Consulting', stage: 'Clarification', responses: 2, invites_sent: 4, close_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1004', customer: 'TechCorp', title: 'Web Development', stage: 'Invited', responses: 0, invites_sent: 3, close_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1005', customer: 'DataFlow Inc', title: 'Analytics Dashboard', stage: 'Closing Soon', responses: 4, invites_sent: 6, close_at: new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1006', customer: 'CloudTech', title: 'Migration Project', stage: 'Closed', responses: 2, invites_sent: 4, close_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1007', customer: 'MobileFirst', title: 'App Development', stage: 'Bidding', responses: 1, invites_sent: 3, close_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { id: 'BR-1008', customer: 'Enterprise Solutions', title: 'System Integration', stage: 'New', responses: 0, invites_sent: 1, close_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  ],
  experts: [
    { id: 'EXP-501', name: 'John Smith', category: 'Freelance', skills: ['React', 'Node.js'], utilization: 75, available: true, recent_bids: 3, wins: 2, last_active: new Date() },
    { id: 'EXP-502', name: 'Sarah Johnson', category: 'Partner', skills: ['Python', 'Django'], utilization: 60, available: true, recent_bids: 2, wins: 1, last_active: new Date() },
    { id: 'EXP-503', name: 'Mike Chen', category: 'Freelance', skills: ['Vue.js', 'MongoDB'], utilization: 90, available: false, recent_bids: 1, wins: 0, last_active: new Date() }
  ],
  projects: [
    { id: 'PRJ-801', customer: 'Acme Corp', expert: 'John Smith', start: new Date(), due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: 'Active', escalations: 0 },
    { id: 'PRJ-802', customer: 'Global Inc', expert: 'Sarah Johnson', start: new Date(), due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: 'Blocked', escalations: 1 }
  ],
  kpis: {
    bidsByStage: { 'New': 2, 'Invited': 1, 'Bidding': 2, 'Clarification': 1, 'Closing Soon': 1, 'Closed': 1 },
    activeExperts: 2,
    idleExperts: 1,
    responseRate: 60,
    closingSoon: 1,
    unresponded: 3
  }
};

// Helper function to check if backend is available
async function isBackendAvailable() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      mode: 'cors',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export const api = {
  // Health check
  async health() {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return { status: 'OK', message: 'Using mock data' };
      }
    }
    return { status: 'OK', message: 'Using mock data' };
  },

  // Get all bids
  async getBids() {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/bids`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return mockData.bids;
      }
    }
    return mockData.bids;
  },

  // Get bids by stage
  async getBidsByStage(stage) {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/bids/stage/${stage}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return mockData.bids.filter(bid => bid.stage === stage);
      }
    }
    return mockData.bids.filter(bid => bid.stage === stage);
  },

  // Get all experts
  async getExperts() {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/experts`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return mockData.experts;
      }
    }
    return mockData.experts;
  },

  // Get all projects
  async getProjects() {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return mockData.projects;
      }
    }
    return mockData.projects;
  },

  // Get dashboard KPIs
  async getKPIs() {
    if (await isBackendAvailable()) {
      try {
        const response = await fetch(`${API_BASE_URL}/kpis`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Backend API failed, using mock data:', error.message);
        return mockData.kpis;
      }
    }
    return mockData.kpis;
  }
};
