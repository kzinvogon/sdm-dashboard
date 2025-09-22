import React, { useMemo, useState } from "react";
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

// ---------- Mock Data ---------- //
const now = new Date();

const BID_STAGES = [
  "New",
  "Invited",
  "Bidding",
  "Clarification",
  "Closing Soon",
  "Closed",
];

const bids = Array.from({ length: 40 }).map((_, i) => ({
  id: `BR-${1000 + i}`,
  customer: ["Acme Ltd", "Bleckmann", "Contoso", "Globex"][i % 4],
  title: ["Migrate to Azure", "Magento Upgrade", "SOC2 Hardening", "Xero API" ][i % 4],
  primary_skill: ["Azure", "Magento", "Security", "Node.js"][i % 4],
  stage: BID_STAGES[i % BID_STAGES.length],
  csm: ["Jane", "Rafa", "Mila"][i % 3],
  close_at: new Date(now.getTime() + (i - 8) * 6 * 3600 * 1000), // spread every 6h
  invites_sent: 2 + (i % 5),
  responses: i % 5, // 0..4
  best_price: 2500 + (i % 7) * 500,
  best_score: 55 + (i % 40),
  last_update: new Date(now.getTime() - (i % 12) * 3600 * 1000),
  region: ["EU", "UK", "US"][i % 3],
  budget_band: ["Low", "Mid", "High"][i % 3],
}));

const experts = Array.from({ length: 28 }).map((_, i) => ({
  id: `EXP-${500 + i}`,
  name: ["Ana Ruiz", "Bob Lee", "Chen Wu", "Daria Novak", "Evan Shaw"][i % 5] + " " + (i+1),
  category: ["Freelance", "Partner", "Reseller", "FTE"][i % 4],
  skills: ["Azure", "Node.js", "React", "Magento", "Security"].slice(0, 1 + (i % 4)),
  tz: ["Europe/Madrid", "Europe/Lisbon", "UTC", "US/Eastern"][i % 4],
  utilization: (i * 13) % 100,
  available: i % 3 !== 0,
  rating: 3 + (i % 3),
  last_active: new Date(now.getTime() - (i % 48) * 3600 * 1000),
  recent_bids: (i * 2) % 9,
  wins: i % 5,
}));

const projects = Array.from({ length: 14 }).map((_, i) => ({
  id: `PRJ-${800 + i}`,
  customer: ["Acme Ltd", "Bleckmann", "Contoso", "Globex"][i % 4],
  expert: experts[i % experts.length].name,
  start: new Date(now.getTime() - (i + 1) * 24 * 3600 * 1000),
  due: new Date(now.getTime() + (i % 10) * 24 * 3600 * 1000),
  status: ["Active", "Blocked", "Escalated", "Completed"][i % 4],
  escalations: i % 3,
}));

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

// Expert categories pie data
const expertCategory = [
  { name: "Freelance", value: experts.filter((e) => e.category === "Freelance").length },
  { name: "Partner", value: experts.filter((e) => e.category === "Partner").length },
  { name: "Reseller", value: experts.filter((e) => e.category === "Reseller").length },
  { name: "FTE", value: experts.filter((e) => e.category === "FTE").length },
];

// ---------- Utilities ---------- //
const fmt = (d) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);

const classNames = (...c) => c.filter(Boolean).join(" ");

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
      {/* Panel */}
      <div
        className={classNames(
          "absolute right-0 top-0 h-full w-full sm:w-[640px] bg-white shadow-2xl flex flex-col",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
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

// ---------- Grid (simple table) ---------- //
function Table({ columns, rows, rowKey = (r) => r.id, empty = "No data" }) {
  return (
    <div className="border rounded-2xl overflow-hidden">
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
            <tr key={rowKey(r)} className="odd:bg-white even:bg-gray-50">
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
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="h-40">
        {children}
      </div>
      {footer && <div className="mt-3 text-xs text-gray-500">{footer}</div>}
    </div>
  );
}

// ---------- Main Component ---------- //
export default function SDMDashboard() {
  const [windowPreset, setWindowPreset] = useState("7d");
  const [drawer, setDrawer] = useState({ open: false, title: "", content: null });

  // Derived KPIs
  const bidsByStage = useMemo(() => {
    return BID_STAGES.map((stage) => ({
      stage,
      count: bids.filter((b) => b.stage === stage).length,
    }));
  }, []);

  const closingSoon = useMemo(() =>
    bids.filter(
      (b) => ["Invited", "Bidding", "Clarification"].includes(b.stage) && (b.close_at - now) <= 24 * 3600 * 1000 && (b.close_at - now) > 0
    ),
  []);

  const unresponded = useMemo(() => bids.filter((b) => b.responses === 0), []);

  const invites = bids.reduce((acc, b) => acc + b.invites_sent, 0);
  const responses = bids.reduce((acc, b) => acc + b.responses, 0);
  const responseRate = invites ? Math.round((responses / invites) * 100) : 0;

  const activeExperts = experts.filter((e) => e.recent_bids > 0 || projects.some((p) => p.expert === e.name && ["Active", "Escalated"].includes(p.status))).length;
  const idleExperts = experts.length - activeExperts;

  // Handlers to open specific drilldowns
  const openBidGrid = (rows, title) => {
    setDrawer({
      open: true,
      title,
      content: (
        <>
          <div className="mb-3 flex gap-2">
            <button className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200">Export CSV</button>
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
              { key: "close_at", header: "Close", render: (r) => fmt(r.close_at) },
              { key: "invites_sent", header: "Invites" },
              { key: "responses", header: "Responses" },
              { key: "best_price", header: "Best Price" },
              { key: "best_score", header: "Best Score" },
              { key: "last_update", header: "Last Update", render: (r) => fmt(r.last_update) },
            ]}
            rows={rows}
          />
        </>
      ),
    });
  };

  const openExpertGrid = (rows, title) => {
    setDrawer({
      open: true,
      title,
      content: (
        <>
          <div className="mb-3 flex gap-2">
            <button className="px-3 py-1 rounded-xl bg-gray-100 hover:bg-gray-200">Export CSV</button>
            <button className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Invite to Bid</button>
            <button className="px-3 py-1 rounded-xl bg-white border hover:bg-gray-50">Nudge</button>
          </div>
          <Table
            columns={[
              { key: "id", header: "Expert ID" },
              { key: "name", header: "Name" },
              { key: "category", header: "Category" },
              { key: "skills", header: "Skills", render: (r) => (
                <div className="flex flex-wrap gap-1">{r.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 text-xs rounded-full bg-gray-100">{s}</span>
                ))}</div>
              ) },
              { key: "tz", header: "TZ" },
              { key: "utilization", header: "Util %" },
              { key: "recent_bids", header: "Recent Bids" },
              { key: "wins", header: "Wins" },
              { key: "last_active", header: "Last Active", render: (r) => fmt(r.last_active) },
            ]}
            rows={rows}
          />
        </>
      ),
    });
  };

  const openProjectsGrid = (rows, title) => {
    setDrawer({
      open: true,
      title,
      content: (
        <Table
          columns={[
            { key: "id", header: "Project ID" },
            { key: "customer", header: "Customer" },
            { key: "expert", header: "Expert" },
            { key: "start", header: "Start", render: (r) => fmt(r.start) },
            { key: "due", header: "Due", render: (r) => fmt(r.due) },
            { key: "status", header: "Status" },
            { key: "escalations", header: "Escalations" },
          ]}
          rows={rows}
        />
      ),
    });
  };

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
          <Card title="Open Bids by Stage" onClick={() => openBidGrid(bids, "All Bids")}
            footer="Click to view bid list"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bidsByStage}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Active vs Idle Experts */}
          <Card title="Active Experts vs Idle" onClick={() => openExpertGrid(experts, "All Experts")}
            footer={`${activeExperts} active / ${idleExperts} idle`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Experts", Active: activeExperts, Idle: idleExperts }]}
                stackOffset="expand"
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Legend />
                <Bar dataKey="Active" stackId="a" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Idle" stackId="a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Alerts: Closing Soon */}
          <Card title="Bids Closing in Next 24h" onClick={() => openBidGrid(closingSoon, "Closing in 24h")}
            footer="Turns red when coverage below target"
          >
            <div className="h-full flex items-center justify-center">
              <div className={classNames(
                "text-5xl font-bold", closingSoon.length < 3 ? "text-red-600" : "text-gray-800"
              )}>{closingSoon.length}</div>
            </div>
          </Card>

          {/* Unresponded Bids */}
          <Card title="Unresponded Bids" onClick={() => openBidGrid(unresponded, "Unresponded Bids")}
            footer="Zero responses since invite"
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-5xl font-bold">{unresponded.length}</div>
            </div>
          </Card>

          {/* Response Rate */}
          <Card title="Response Rate" onClick={() => openBidGrid(bids, "All Invites & Responses")}
            footer={`${responses} responses / ${invites} invites`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[{ name: "Responses", value: responses }, { name: "No Response", value: Math.max(invites - responses, 0) }]}
                  innerRadius={50} outerRadius={70} paddingAngle={2}
                >
                  <Cell />
                  <Cell />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold">{responseRate}%</div>
            </div>
          </Card>

          {/* Expert Categories */}
          <Card title="Expert Categories" onClick={() => openExpertGrid(experts, "Experts by Category")}
            footer="Distribution of available supply"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" nameKey="name" data={expertCategory} outerRadius={70}>
                  {expertCategory.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Expert Availability Risk */}
          <Card title="Expert Availability Risk" onClick={() => openProjectsGrid(projects.filter(p => p.status !== "Completed"), "Availability & Delivery Risks")}
            footer="Accepted but not confirmed, overlaps, >80% utilization"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={experts.slice(0, 6).map((e) => ({ name: e.name.split(" ")[0], risk: e.utilization > 80 ? 1 : 0 }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="risk" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Average Bids per Request */}
          <Card title="Average Bids per Request" onClick={() => openBidGrid(bids, "Bid Coverage Trend")}
            footer="Target ≥ 3.5"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={avgBidsSeries}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Customer Acceptance Rate */}
          <Card title="Customer Acceptance Rate" onClick={() => openBidGrid(bids, "Presented vs Outcomes")}
            footer="Accepted vs Rejected on presented offers"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acceptanceBar}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Live Projects by Status */}
          <Card title="Live Projects by Status" onClick={() => openProjectsGrid(projects, "Project Portfolio")}
            footer="Active / Blocked / Escalated / Completed"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={["Active", "Blocked", "Escalated", "Completed"].map((s) => ({
                status: s,
                count: projects.filter((p) => p.status === s).length,
              }))}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
    </div>
  );
}
