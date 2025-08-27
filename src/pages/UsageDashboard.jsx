import { useState, useEffect, useContext } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ThemeContext } from '../App';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function UsageDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    let intervalId;

    async function fetchUsage() {
      try {
        setRefreshing(true);
        const res = await fetch("https://live-server1.com/api/usage");
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`Expected JSON but received: ${text.substring(0, 200)}`);
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        setData(json);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Usage fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }

    fetchUsage();
    intervalId = setInterval(fetchUsage, 30000); // Refresh every 30s

    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <p className="p-6 text-center text-gray-500">Loading usage data...</p>;
  if (error) return <p className="p-6 text-center text-red-500">Error: {error}</p>;
  if (!data) return null;

  const { metrics, recentUploads, recentQueries, recentIPs } = data;

  const uploadsData = [
    { name: 'Uploads', Success: metrics.totalUploads - metrics.failedUploads, Failed: metrics.failedUploads }
  ];

  const queriesData = [
    { name: 'Queries', Success: metrics.totalQueries - metrics.failedQueries, Failed: metrics.failedQueries }
  ];

  const cardStyle = "p-5 rounded-lg shadow-md transition hover:shadow-xl";

  const Badge = ({ children, type }) => {
    const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
    const colors = {
      success: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200",
      error: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200",
    };
    return <span className={`${base} ${colors[type]}`}>{children}</span>;
  };

  const TableCard = ({ title, columns, rows }) => (
    <div className={`${cardStyle} bg-white dark:bg-gray-800 overflow-x-auto`}>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <table className="min-w-full table-auto border-collapse border border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 border text-left text-xs text-gray-500 dark:text-gray-300">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              {row.map((cell, j) => <td key={j} className="px-2 py-1 border font-mono text-sm truncate max-w-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const uploadsRows = recentUploads.map(u => [
    u.chunkId,
    u.size,
    u.success ? <Badge type="success">✔️</Badge> : <Badge type="error">❌</Badge>,
    u.requestId,
    u.ipAddress,
    u.userAgent,
    new Date(u.createdAt).toLocaleString()
  ]);

  const queriesRows = recentQueries.map(q => [
    q.userId,
    q.segmentId,
    q.success ? <Badge type="success">✔️</Badge> : <Badge type="error">❌</Badge>,
    new Date(q.createdAt).toLocaleString()
  ]);

  const ipsRows = recentIPs.map(ip => [
    ip.ipAddress,
    ip.userAgent,
    new Date(ip.createdAt).toLocaleString()
  ]);

  return (
    <div className={`p-6 space-y-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Usage Dashboard
          {refreshing && <span className="text-sm text-blue-400 animate-pulse">⟳ Refreshing...</span>}
        </h1>
        {lastUpdated && <span className="text-xs text-gray-400">Last update: {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      {user && <p className="text-sm text-gray-400">Logged in as: {user.email}</p>}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className={`${cardStyle} bg-green-50 dark:bg-green-900`}>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-200">Total Uploads</p>
          <p className="text-2xl font-mono font-bold">{metrics.totalUploads}</p>
        </div>
        <div className={`${cardStyle} bg-red-50 dark:bg-red-900`}>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-200">Failed Uploads</p>
          <p className="text-2xl font-mono font-bold">{metrics.failedUploads}</p>
        </div>
        <div className={`${cardStyle} bg-green-50 dark:bg-green-900`}>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-200">Total Queries</p>
          <p className="text-2xl font-mono font-bold">{metrics.totalQueries}</p>
        </div>
        <div className={`${cardStyle} bg-red-50 dark:bg-red-900`}>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-200">Failed Queries</p>
          <p className="text-2xl font-mono font-bold">{metrics.failedQueries}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${cardStyle} bg-white dark:bg-gray-800`}>
          <h2 className="text-lg font-semibold mb-2">Uploads (Success vs Failed)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={uploadsData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#eee'} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Success" fill="#10B981" />
              <Bar dataKey="Failed" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${cardStyle} bg-white dark:bg-gray-800`}>
          <h2 className="text-lg font-semibold mb-2">Queries (Success vs Failed)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={queriesData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#444' : '#eee'} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Success" fill="#10B981" />
              <Bar dataKey="Failed" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <TableCard
        title="Recent Uploads"
        columns={['Chunk ID', 'Size', 'Success', 'Request ID', 'IP', 'User Agent', 'Created At']}
        rows={uploadsRows}
      />

      <TableCard
        title="Recent Queries"
        columns={['User ID', 'Segment ID', 'Success', 'Created At']}
        rows={queriesRows}
      />

      <TableCard
        title="Recent IPs / User Agents"
        columns={['IP Address', 'User Agent', 'Created At']}
        rows={ipsRows}
      />
    </div>
  );
}
