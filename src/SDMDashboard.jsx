import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "./api";

/**
 * Service Delivery Manager Dashboard — React Mock (v1)
 * - TailwindCSS for layout/styling
 * - Recharts for charts
 * - Click any card to open a drill‑down panel with a contextual grid and quick actions
 * - Mock data + simple in‑memory filters
 *
 * Notes:
 * - Designed for preview; no external UI libs required
 * - Replace mock API hooks with real endpoints per the functional spec
 */

// ---------- Constants ---------- //
const BID_STAGES = [
  "New",
  "Invited", 
  "Bidding",
  "Clarification",
  "Closing Soon",
  "Closed",
  "Unknown",
];

// Color scheme for charts
const COLORS = {
  primary: '#4F46E5',      // Indigo
  secondary: '#10B981',    // Emerald
  accent: '#F59E0B',       // Amber
  danger: '#EF4444',       // Red
  warning: '#F97316',      // Orange
  success: '#059669',      // Green
  info: '#3B82F6',         // Blue
  purple: '#8B5CF6',       // Purple
  pink: '#EC4899',         // Pink
  teal: '#14B8A6',         // Teal
  gray: '#6B7280',         // Gray
  slate: '#64748B',        // Slate
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.danger,
  COLORS.warning,
  COLORS.success,
  COLORS.info,
  COLORS.purple,
  COLORS.pink,
  COLORS.teal,
];

// Line data: Avg bids/request over last 10 days
const avgBidsSeries = Array.from({ length: 10 }).map((_, i) => ({
  day: `D${i + 1}`,
  avg: 2 + ((i * 7) % 25) / 10, // 2.0 .. 4.5
}));

// Acceptance bar data
const acceptanceBar = [
  { label: "Presented", value: 26 },
  { label: "Accepted", value: 12 },
  { label: "Rejected", value: 9 },
];

// ---------- Utilities ---------- //
const fmt = (d) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);

const classNames = (...c) => c.filter(Boolean).join(" ");

// CSV Export utility
const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from the first row
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ---------- Drilldown Panel ---------- //
function Drawer({ open, onClose, title, children }) {
  return (
    <div className={classNames("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={classNames(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Panel - Now at bottom */}
      <div
        className={classNames(
          "absolute bottom-0 left-0 right-0 h-3/4 bg-white shadow-2xl flex flex-col",
          "transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="rounded-xl px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200">Close</button>
          </div>
        </div>
        <div className="p-4 overflow-auto grow">{children}</div>
      </div>
    </div>
  );
}

// ---------- Detail Modal ---------- //
function DetailModal({ open, onClose, title, data }) {
  if (!data) return null;

  const renderBidDetails = (bid) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">ID:</span> {bid.id}</div>
            <div><span className="font-medium">Customer:</span> {bid.customer}</div>
            <div><span className="font-medium">Title:</span> {bid.title}</div>
            <div><span className="font-medium">Stage:</span> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{bid.stage}</span></div>
            <div><span className="font-medium">CSM:</span> {bid.csm}</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Bidding Details</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Invites Sent:</span> {bid.invites_sent}</div>
            <div><span className="font-medium">Responses:</span> {bid.responses}</div>
            <div><span className="font-medium">Best Price:</span> ${bid.best_price?.toLocaleString() || 'N/A'}</div>
            <div><span className="font-medium">Best Score:</span> {bid.best_score || 'N/A'}</div>
            <div><span className="font-medium">Budget Band:</span> {bid.budget_band}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Timeline</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Close Date:</span> {bid.close_at ? fmt(new Date(bid.close_at)) : 'N/A'}</div>
          <div><span className="font-medium">Last Update:</span> {bid.last_update ? fmt(new Date(bid.last_update)) : 'N/A'}</div>
        </div>
      </div>
    </div>
  );

  const renderExpertDetails = (expert) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Personal Information</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">ID:</span> {expert.id}</div>
            <div><span className="font-medium">Name:</span> {expert.name}</div>
            <div><span className="font-medium">Category:</span> <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{expert.category}</span></div>
            <div><span className="font-medium">Available:</span> <span className={`px-2 py-1 rounded-full text-xs ${expert.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{expert.available ? 'Yes' : 'No'}</span></div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Performance</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Utilization:</span> {expert.utilization}%</div>
            <div><span className="font-medium">Recent Bids:</span> {expert.recent_bids}</div>
            <div><span className="font-medium">Wins:</span> {expert.wins}</div>
            <div><span className="font-medium">Rating:</span> {expert.rating || 'N/A'}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {(expert.skills || []).map((skill, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{skill}</span>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 p-3 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Activity</h4>
        <div className="text-sm">
          <div><span className="font-medium">Last Active:</span> {expert.last_active ? fmt(new Date(expert.last_active)) : 'N/A'}</div>
        </div>
      </div>
    </div>
  );

  const renderProjectDetails = (project) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Project Information</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">ID:</span> {project.id}</div>
            <div><span className="font-medium">Customer:</span> {project.customer}</div>
            <div><span className="font-medium">Expert:</span> {project.expert}</div>
            <div><span className="font-medium">Status:</span> <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">{project.status}</span></div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Timeline & Issues</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Start Date:</span> {project.start ? fmt(new Date(project.start)) : 'N/A'}</div>
            <div><span className="font-medium">Due Date:</span> {project.due ? fmt(new Date(project.due)) : 'N/A'}</div>
            <div><span className="font-medium">Escalations:</span> {project.escalations}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const getDetailContent = () => {
    if (data.type === 'bid') return renderBidDetails(data.item);
    if (data.type === 'expert') return renderExpertDetails(data.item);
    if (data.type === 'project') return renderProjectDetails(data.item);
    return <div>No details available</div>;
  };

  return (
    <div className={classNames("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={classNames(
          "absolute inset-0 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      {/* Modal */}
      <div
        className={classNames(
          "absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl flex flex-col",
          "transition-all duration-300",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button 
            onClick={onClose} 
            className="rounded-xl px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
        <div className="p-6 overflow-auto grow">
          {getDetailContent()}
        </div>
      </div>
    </div>
  );
}

// ---------- Grid (simple table) ---------- //
function Table({ columns, rows, rowKey = (r) => r.id, empty = "No data", onExport, exportFilename, onRowClick, rowType }) {
  return (
    <div className="border rounded-2xl overflow-hidden">
      {onExport && rows.length > 0 && (
        <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
          <span className="text-sm text-gray-600">{rows.length} records</span>
          <button
            onClick={() => onExport(rows, exportFilename)}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            📊 Export CSV
          </button>
        </div>
      )}
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left px-4 py-2 font-medium text-gray-600">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-gray-500" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr 
              key={rowKey(r)} 
              className={classNames(
                "odd:bg-white even:bg-gray-50 transition-colors",
                onRowClick ? "cursor-pointer hover:bg-blue-50 hover:shadow-sm" : ""
              )}
              onClick={onRowClick ? () => onRowClick(r, rowType) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2 align-top">
                  {typeof c.render === "function" ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- KPI Cards ---------- //
function Card({ title, children, onClick, footer }) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        "rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer",
        "flex flex-col w-full"
      )}
      style={{ minHeight: '300px' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">{title}</h4>
      </div>
      
      {/* Chart Container - Fixed Height */}
      <div className="h-40 mb-4 relative">
        {children}
      </div>
      
      {/* Details Container - Always Below */}
      {footer && (
        <div className="mt-auto">
          <div className="border-t border-gray-200 my-3"></div>
          <div className="text-xs text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-200 font-medium w-full">
            <div className="text-blue-600 font-semibold mb-1">📋 Details:</div>
            <div className="break-words whitespace-normal">
              {footer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ---------- //
// Dashboard with enhanced details below charts
export default function SDMDashboard() {
  const [windowPreset, setWindowPreset] = useState("7d");
  const [drawer, setDrawer] = useState({ open: false, title: "", content: null });
  const [detailModal, setDetailModal] = useState({ open: false, title: "", data: null });
  const [data, setData] = useState({
    bids: [],
    experts: [],
    projects: [],
    kpis: null,
    loading: true,
    error: null
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const [bids, experts, projects, kpis] = await Promise.all([
          api.getBids(),
          api.getExperts(),
          api.getProjects(),
          api.getKPIs()
        ]);

        setData({
          bids,
          experts,
          projects,
          kpis,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    fetchData();
  }, []);

  // Derived KPIs
  const bidsByStage = useMemo(() => {
    if (data.kpis?.bidsByStage) {
      return Object.entries(data.kpis.bidsByStage).map(([stage, count]) => ({
        stage,
        count
      }));
    }
    return BID_STAGES.map((stage) => ({
      stage,
      count: data.bids.filter((b) => b.stage === stage).length,
    }));
  }, [data.bids, data.kpis]);

  const closingSoon = useMemo(() => {
    if (data.kpis?.closingSoon !== undefined) {
      return data.kpis.closingSoon;
    }
    return data.bids.filter(b => {
      if (!b.close_at) return false;
      const daysUntilEnd = (new Date(b.close_at) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 1 && daysUntilEnd > 0;
    }).length;
  }, [data.bids, data.kpis]);

  const unresponded = useMemo(() => {
    if (data.kpis?.unresponded !== undefined) {
      return data.kpis.unresponded;
    }
    return data.bids.filter((b) => b.responses === 0).length;
  }, [data.bids, data.kpis]);

  const responseRate = useMemo(() => {
    if (data.kpis?.responseRate !== undefined) {
      return data.kpis.responseRate;
    }
    const invites = data.bids.reduce((acc, b) => acc + (b.invites_sent || 0), 0);
    const responses = data.bids.reduce((acc, b) => acc + (b.responses || 0), 0);
    return invites ? Math.round((responses / invites) * 100) : 0;
  }, [data.bids, data.kpis]);

  const activeExperts = useMemo(() => {
    if (data.kpis?.activeExperts !== undefined) {
      return data.kpis.activeExperts;
    }
    return data.experts.filter((e) => e.recent_bids > 0 || data.projects.some((p) => p.expert === e.name && ["Active", "Escalated"].includes(p.status))).length;
  }, [data.experts, data.projects, data.kpis]);

  const idleExperts = useMemo(() => {
    if (data.kpis?.idleExperts !== undefined) {
      return data.kpis.idleExperts;
    }
    return data.experts.length - activeExperts;
  }, [data.experts, activeExperts, data.kpis]);

  const expertCategory = useMemo(() => {
    const categories = {};
    data.experts.forEach(expert => {
      const category = expert.category || 'Freelance';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [data.experts]);

  // Handler for row clicks
  const handleRowClick = (item, type) => {
    setDetailModal({
      open: true,
      title: `${type === 'bid' ? 'Bid' : type === 'expert' ? 'Expert' : 'Project'} Details`,
      data: { type, item }
    });
  };

  // Handlers to open specific drilldowns
  const openBidGrid = (rows, title) => {
    console.log('Opening bid grid with:', { rows, title, rowsLength: rows?.length });
    setDrawer({
      open: true,
      title,
      content: (
        <>
          <div className="mb-3 flex gap-2">
            <button 
              onClick={() => exportToCSV(rows || [], `bids-${title.toLowerCase().replace(/\s+/g, '-')}`)}
              className="px-3 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              📊 Export CSV
            </button>
            <button className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Quick Broadcast</button>
            <button className="px-3 py-1 rounded-xl bg-white border hover:bg-gray-50">Escalate to CSM</button>
          </div>
          <Table
            columns={[
              { key: "id", header: "Request ID" },
              { key: "customer", header: "Customer" },
              { key: "title", header: "Title" },
              { key: "primary_skill", header: "Skill" },
              { key: "stage", header: "Stage" },
              { key: "csm", header: "CSM" },
              { key: "close_at", header: "Close", render: (r) => r.close_at ? fmt(new Date(r.close_at)) : 'N/A' },
              { key: "invites_sent", header: "Invites" },
              { key: "responses", header: "Responses" },
              { key: "best_price", header: "Best Price" },
              { key: "best_score", header: "Best Score" },
              { key: "last_update", header: "Last Update", render: (r) => r.last_update ? fmt(new Date(r.last_update)) : 'N/A' },
            ]}
            rows={rows || []}
            onExport={exportToCSV}
            exportFilename={`bids-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onRowClick={handleRowClick}
            rowType="bid"
          />
        </>
      ),
    });
  };

  const openExpertGrid = (rows, title) => {
    console.log('Opening expert grid with:', { rows, title, rowsLength: rows?.length });
    setDrawer({
      open: true,
      title,
      content: (
        <>
          <div className="mb-3 flex gap-2">
            <button 
              onClick={() => exportToCSV(rows || [], `experts-${title.toLowerCase().replace(/\s+/g, '-')}`)}
              className="px-3 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              📊 Export CSV
            </button>
            <button className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Invite to Bid</button>
            <button className="px-3 py-1 rounded-xl bg-white border hover:bg-gray-50">Nudge</button>
          </div>
          <Table
            columns={[
              { key: "id", header: "Expert ID" },
              { key: "name", header: "Name" },
              { key: "category", header: "Category" },
              { key: "skills", header: "Skills", render: (r) => (
                <div className="flex flex-wrap gap-1">{(r.skills || []).map((s, index) => (
                  <span key={index} className="px-2 py-0.5 text-xs rounded-full bg-gray-100">{s || 'N/A'}</span>
                ))}</div>
              ) },
              { key: "tz", header: "TZ" },
              { key: "utilization", header: "Util %" },
              { key: "recent_bids", header: "Recent Bids" },
              { key: "wins", header: "Wins" },
              { key: "last_active", header: "Last Active", render: (r) => r.last_active ? fmt(new Date(r.last_active)) : 'N/A' },
            ]}
            rows={rows || []}
            onExport={exportToCSV}
            exportFilename={`experts-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onRowClick={handleRowClick}
            rowType="expert"
          />
        </>
      ),
    });
  };

  const openProjectsGrid = (rows, title) => {
    console.log('Opening projects grid with:', { rows, title, rowsLength: rows?.length });
    setDrawer({
      open: true,
      title,
      content: (
        <>
          <div className="mb-3 flex gap-2">
            <button 
              onClick={() => exportToCSV(rows || [], `projects-${title.toLowerCase().replace(/\s+/g, '-')}`)}
              className="px-3 py-1 rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              📊 Export CSV
            </button>
            <button className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Escalate</button>
            <button className="px-3 py-1 rounded-xl bg-white border hover:bg-gray-50">Add Milestone</button>
          </div>
          <Table
            columns={[
              { key: "id", header: "Project ID" },
              { key: "customer", header: "Customer" },
              { key: "expert", header: "Expert" },
              { key: "start", header: "Start", render: (r) => r.start ? fmt(new Date(r.start)) : 'N/A' },
              { key: "due", header: "Due", render: (r) => r.due ? fmt(new Date(r.due)) : 'N/A' },
              { key: "status", header: "Status" },
              { key: "escalations", header: "Escalations" },
            ]}
            rows={rows || []}
            onExport={exportToCSV}
            exportFilename={`projects-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onRowClick={handleRowClick}
            rowType="project"
          />
        </>
      ),
    });
  };

  // Loading state
  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{data.error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Service Delivery Manager Dashboard</h1>
          <div className="flex items-center gap-2 text-sm">
            <label className="mr-1 text-gray-600">Window</label>
            <select
              className="rounded-xl border px-3 py-1 bg-white"
              value={windowPreset}
              onChange={(e) => setWindowPreset(e.target.value)}
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="qtr">Quarter</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Open Bids by Stage */}
          <Card title="Open Bids by Stage" onClick={() => {
            console.log('Bids data:', data.bids);
            openBidGrid(data.bids, "All Bids");
          }}
            footer={`📊 ${data.bids.length} bids • ${bidsByStage.length} stages`}
          >
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bidsByStage}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  radius={[8, 8, 0, 0]} 
                  fill={COLORS.primary}
                  stroke={COLORS.primary}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </Card>

          {/* Active vs Idle Experts */}
          <Card title="Active Experts vs Idle" onClick={() => {
            console.log('Experts data:', data.experts);
            openExpertGrid(data.experts, "All Experts");
          }}
            footer={`👥 ${activeExperts} active • ${idleExperts} idle`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Experts", Active: activeExperts, Idle: idleExperts }]}
                stackOffset="expand"
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
                <Bar 
                  dataKey="Active" 
                  stackId="a" 
                  radius={[8, 8, 0, 0]} 
                  fill={COLORS.success}
                  stroke={COLORS.success}
                  strokeWidth={1}
                />
                <Bar 
                  dataKey="Idle" 
                  stackId="a" 
                  radius={[8, 8, 0, 0]} 
                  fill={COLORS.gray}
                  stroke={COLORS.gray}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Alerts: Closing Soon */}
          <Card title="Bids Closing in Next 24h" onClick={() => openBidGrid(data.bids.filter(b => {
            if (!b.close_at) return false;
            const daysUntilEnd = (new Date(b.close_at) - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntilEnd <= 1 && daysUntilEnd > 0;
          }), "Closing in 24h")}
            footer={`⏰ ${closingSoon} closing soon`}
          >
            <div className="h-full flex items-center justify-center">
              <div className={classNames(
                "text-5xl font-bold", closingSoon < 3 ? "text-red-600" : "text-indigo-600"
              )}>{closingSoon}</div>
            </div>
          </Card>

          {/* Unresponded Bids */}
          <Card title="Unresponded Bids" onClick={() => openBidGrid(data.bids.filter(b => b.responses === 0), "Unresponded Bids")}
            footer={`❌ ${unresponded} bids with zero responses • Need immediate attention`}
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-5xl font-bold text-orange-600">{unresponded}</div>
            </div>
          </Card>

          {/* Response Rate */}
          <Card title="Response Rate" onClick={() => openBidGrid(data.bids, "All Invites & Responses")}
            footer={`📈 ${responseRate}% response rate • ${data.bids.reduce((acc, b) => acc + (b.responses || 0), 0)} responses from ${data.bids.reduce((acc, b) => acc + (b.invites_sent || 0), 0)} invites`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[{ name: "Responses", value: data.bids.reduce((acc, b) => acc + (b.responses || 0), 0) }, { name: "No Response", value: Math.max(data.bids.reduce((acc, b) => acc + (b.invites_sent || 0), 0) - data.bids.reduce((acc, b) => acc + (b.responses || 0), 0), 0) }]}
                  innerRadius={50} outerRadius={70} paddingAngle={2}
                >
                  <Cell fill={COLORS.success} stroke={COLORS.success} strokeWidth={2} />
                  <Cell fill={COLORS.gray} stroke={COLORS.gray} strokeWidth={2} />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold text-emerald-600">{responseRate}%</div>
            </div>
          </Card>

          {/* Expert Categories */}
          <Card title="Expert Categories" onClick={() => openExpertGrid(data.experts, "Experts by Category")}
            footer={`🎯 ${expertCategory.length} categories • Click to view expert breakdown`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" nameKey="name" data={expertCategory} outerRadius={70}>
                  {expertCategory.map((_, i) => (
                    <Cell 
                      key={i} 
                      fill={CHART_COLORS[i % CHART_COLORS.length]} 
                      stroke={CHART_COLORS[i % CHART_COLORS.length]} 
                      strokeWidth={2} 
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Expert Availability Risk */}
          <Card title="Expert Availability Risk" onClick={() => openProjectsGrid(data.projects.filter(p => p.status !== "Completed"), "Availability & Delivery Risks")}
            footer={`⚠️ Risk assessment for top 6 experts • Red bars indicate >80% utilization`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.experts.slice(0, 6).map((e) => ({ name: e.name.split(" ")[0], risk: e.utilization > 80 ? 1 : 0 }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar 
                  dataKey="risk" 
                  radius={[8, 8, 0, 0]} 
                  fill={COLORS.danger}
                  stroke={COLORS.danger}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Average Bids per Request */}
          <Card title="Average Bids per Request" onClick={() => openBidGrid(data.bids, "Bid Coverage Trend")}
            footer={`📊 10-day trend • Target: ≥3.5 bids per request • Current average shown`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={avgBidsSeries}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="avg" 
                  strokeWidth={3} 
                  dot={false} 
                  stroke={COLORS.info}
                  strokeDasharray="0"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Customer Acceptance Rate */}
          <Card title="Customer Acceptance Rate" onClick={() => openBidGrid(data.bids, "Presented vs Outcomes")}
            footer={`✅ 12 accepted • ❌ 9 rejected • 📊 26 presented • ${Math.round((12/26)*100)}% acceptance rate`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acceptanceBar}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#F9FAFB', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar 
                  dataKey="value" 
                  radius={[8, 8, 0, 0]} 
                  fill={COLORS.accent}
                  stroke={COLORS.accent}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Live Projects by Status */}
          <Card title="Live Projects by Status" onClick={() => openProjectsGrid(data.projects, "Project Portfolio")}
            footer={`📋 ${data.projects.length} total projects • Active: ${data.projects.filter(p => p.status === 'Active').length} • Blocked: ${data.projects.filter(p => p.status === 'Blocked').length} • Escalated: ${data.projects.filter(p => p.status === 'Escalated').length}`}
          >
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={["Active", "Blocked", "Escalated", "Completed"].map((s) => ({
                  status: s,
                  count: data.projects.filter((p) => p.status === s).length,
                }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F9FAFB', 
                      border: '1px solid #E5E7EB', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]} 
                    fill={COLORS.purple}
                    stroke={COLORS.purple}
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>

      <Drawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, title: "", content: null })}
        title={drawer.title}
      >
        {drawer.content}
      </Drawer>

      {/* Detail Modal */}
      <DetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, title: "", data: null })}
        title={detailModal.title}
        data={detailModal.data}
      />
    </div>
  );
}
