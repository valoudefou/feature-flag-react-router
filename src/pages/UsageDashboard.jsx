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

  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    let interval;
    async function fetchUsage() {
      try {
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
      }
    }

    fetchUsage();
    interval = setInterval(fetchUsage, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="p-4">Loading usage data...</p>;
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (!data) return null;

  const { metrics, recentUploads, recentQueries, recentIPs } = data;

  const uploadsData = [
    { name: 'Uploads', Success: metrics.totalUploads - metrics.failedUploads, Failed: metrics.failedUploads }
  ];

  const queriesData = [
    { name: 'Queries', Success: metrics.totalQueries - metrics.failedQueries, Failed: metrics.failedQueries }
  ];

  const badge = (success) => (
    <span className={`px-2 py-1 rounded-full text-xs font-mono ${success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
      {success ? '✅' : '❌'}
    </span>
  );

  const cardStyle = 'bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow';

  return (
    <div className={`p-6 space-y-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Usage Dashboard</h1>
        {lastUpdated && <p className="text-sm text-gray-500 dark:text-gray-300">Updated: {lastUpdated.toLocaleTimeString()}</p>}
      </div>
{/* Metrics */}
<div className="flex flex-wrap gap-4">
  {/* Total Uploads */}
  <div className={`${cardStyle} flex-1 border-l-4 border-green-500`}>
    <p className="text-sm font-medium">Total Uploads</p>
    <p className="text-2xl font-bold">{metrics.totalUploads} ✅</p>
  </div>

  {/* Failed Uploads */}
  <div className={`${cardStyle} flex-1 border-l-4 border-red-500`}>
    <p className="text-sm font-medium">Failed Uploads</p>
    <p className="text-2xl font-bold">{metrics.failedUploads} ❌</p>
  </div>

    {/* Total Queries */}
    <div className={`${cardStyle} flex-1 border-l-4 border-green-500`}>
        <p className="text-sm font-medium">Total Queries</p>
        <p className="text-2xl font-bold">{metrics.totalQueries} ✅</p>
    </div>

    {/* Failed Queries */}
    <div className={`${cardStyle} flex-1 border-l-4 border-red-500`}>
        <p className="text-sm font-medium">Failed Queries</p>
        <p className="text-2xl font-bold">{metrics.failedQueries} ❌</p>
    </div>
    </div>

      {/* Charts */}
      <div className="flex flex-col gap-6">
        <div className={cardStyle}>
          <p className="text-lg font-semibold mb-2">Uploads (Success vs Failed)</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={uploadsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Success" fill="#4ade80" />
              <Bar dataKey="Failed" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={cardStyle}>
          <p className="text-lg font-semibold mb-2">Queries (Success vs Failed)</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={queriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Success" fill="#4ade80" />
              <Bar dataKey="Failed" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="flex flex-col gap-4">
        <p className="text-lg font-semibold mb-2">Recent Uploads</p>
        {recentUploads.map(u => (
          <div key={u.id} className={cardStyle}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-sm truncate">{u.chunkId}</span>
              {badge(u.success)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-300">Size: {u.size} | RequestID: {u.requestId}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300">IP: {u.ipAddress}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 truncate">UA: {u.userAgent}</div>
            <div className="text-xs text-gray-400 mt-1">{new Date(u.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Recent Queries */}
      <div className="flex flex-col gap-4">
        <p className="text-lg font-semibold mb-2">Recent Queries</p>
        {recentQueries.map(q => (
          <div key={q.id} className={cardStyle}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-sm truncate">UserID: {q.userId}</span>
              {badge(q.success)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-300 truncate">SegmentID: {q.segmentId}</div>
            <div className="text-xs text-gray-400 mt-1">{new Date(q.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Recent IPs */}
      <div className="flex flex-col gap-4">
        <p className="text-lg font-semibold mb-2">Recent IPs / User Agents</p>
        {recentIPs.map(ip => (
          <div key={ip.createdAt} className={cardStyle}>
            <div className="font-mono text-sm">{ip.ipAddress}</div>
            <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{ip.userAgent}</div>
            <div className="text-xs text-gray-400 mt-1">{new Date(ip.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
