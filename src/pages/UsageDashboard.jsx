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

  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
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

  return (
    <div className={`p-6 space-y-8 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h1 className="text-2xl font-bold">Usage Dashboard</h1>
      {user && <p className="text-sm">Logged in as: {user.email}</p>}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-green-100 rounded shadow">
          <h2 className="font-semibold">Total Uploads</h2>
          <p className="text-xl">{metrics.totalUploads}</p>
        </div>
        <div className="p-4 bg-red-100 rounded shadow">
          <h2 className="font-semibold">Failed Uploads</h2>
          <p className="text-xl">{metrics.failedUploads}</p>
        </div>
        <div className="p-4 bg-green-100 rounded shadow">
          <h2 className="font-semibold">Total Queries</h2>
          <p className="text-xl">{metrics.totalQueries}</p>
        </div>
        <div className="p-4 bg-red-100 rounded shadow">
          <h2 className="font-semibold">Failed Queries</h2>
          <p className="text-xl">{metrics.failedQueries}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">Uploads (Success vs Failed)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={uploadsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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

        <div>
          <h2 className="text-xl font-semibold mb-2">Queries (Success vs Failed)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={queriesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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

      {/* Tables (recent uploads, queries, IPs) */}
      {/* ... Keep your tables code from before ... */}
    </div>
  );
}
