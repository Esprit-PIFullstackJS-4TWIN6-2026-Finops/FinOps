import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useSocket } from "./SocketContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function KpiCard({ title, value, pct }) {
  const color = pct >= 0 ? "#16a34a" : "#dc2626";
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ color, fontSize: 12 }}>{pct.toFixed(2)}%</div>
    </div>
  );
}

export default function Dashboard() {
  const { socket } = useSocket();
  const [kpi, setKpi] = useState(null);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [expenseSeries, setExpenseSeries] = useState([]);
  const [forecast, setForecast] = useState({ history: [], forecast: [] });
  const [ai, setAi] = useState(null);
  const [prefs, setPrefs] = useState({ kpis: ["revenue", "expenses", "retention", "profit"], theme: "light", layout: [] });
  const [period, setPeriod] = useState("6m");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");

  const load = async () => {
    const [kpiRes, revRes, expRes, fRes, aiRes, prefRes] = await Promise.all([
      api.get("/kpi/summary"),
      api.get("/charts/revenues", { params: { period, department } }),
      api.get("/charts/expenses-categories", { params: { category } }),
      api.get("/forecast"),
      api.get("/ai/insights"),
      api.get("/preferences/me"),
    ]);
    setKpi(kpiRes.data);
    setRevenueSeries(revRes.data);
    setExpenseSeries(expRes.data);
    setForecast(fRes.data);
    setAi(aiRes.data);
    setPrefs(prefRes.data);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [period, department, category]);

  useEffect(() => {
    if (!socket) return;
    socket.on("kpi_update", (payload) => setKpi(payload));
    return () => socket.off("kpi_update");
  }, [socket]);

  const forecastData = useMemo(() => {
    const history = forecast.history.map((r) => ({ month: r.month, actual: Number(r.revenue), forecast: null }));
    const future = forecast.forecast.map((f) => ({ month: `+${f.month_offset}m`, actual: null, forecast: f.forecast_revenue }));
    return [...history, ...future];
  }, [forecast]);

  if (!kpi) return <div style={{ padding: 24 }}>Loading dashboard...</div>;

  const exportReport = async (format) => {
    const response = await api.get(`/export?format=${format}`, { responseType: "blob" });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard.${format === "excel" ? "xlsx" : format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { key: "revenue", title: "Revenus totaux", value: kpi.revenue_total, pct: kpi.trend_month.revenue_pct },
    { key: "expenses", title: "Charges", value: kpi.expenses_total, pct: kpi.trend_month.expenses_pct },
    { key: "retention", title: "Rétention", value: `${kpi.retention_rate.toFixed(2)}%`, pct: 0 },
    { key: "profit", title: "Bénéfice net", value: kpi.net_profit, pct: kpi.trend_month.profit_pct },
  ].filter((c) => prefs.kpis?.includes(c.key));

  return (
    <div style={{ padding: 20, display: "grid", gap: 18, background: "#f7f7f9" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="6m">6 mois</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Année</option>
        </select>
        <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Filtre département" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filtre catégorie" />
        <button onClick={() => exportReport("csv")}>Export CSV</button>
        <button onClick={() => exportReport("excel")}>Export Excel</button>
        <button onClick={() => exportReport("pdf")}>Export PDF</button>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        {kpiCards.map((c) => <KpiCard key={c.key} title={c.title} value={c.value} pct={c.pct} />)}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <h3>Revenus (6 mois)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="revenue" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <h3>Dépenses par catégorie</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={expenseSeries} dataKey="amount" nameKey="category" outerRadius={85} fill="#82ca9d" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <h3>Prévisions revenus (moyenne mobile)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="actual" fill="#2563eb" />
            <Bar dataKey="forecast" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {ai && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <h3>Intelligence IA</h3>
          <p>{ai.executiveSummary}</p>
          <p><strong>Score santé:</strong> {ai.healthScore}/100</p>
          <ul>{ai.alerts.map((a, i) => <li key={i}>[{a.level}] {a.title} - {a.description}</li>)}</ul>
          <ul>{ai.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

