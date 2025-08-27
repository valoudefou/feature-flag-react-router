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
      } catch (err) {
        console.error("Usage fetch error:", err);
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

      {/* Recent Uploads Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Uploads</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">Chunk ID</th>
                <th className="px-3 py-2 border">Size</th>
                <th className="px-3 py-2 border">Success</th>
                <th className="px-3 py-2 border">Request ID</th>
                <th className="px-3 py-2 border">IP</th>
                <th className="px-3 py-2 border">User Agent</th>
                <th className="px-3 py-2 border">Created At</th>
              </tr>
            </thead>
            <tbody>
              {recentUploads.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{u.chunkId}</td>
                  <td className="px-3 py-2 border">{u.size}</td>
                  <td className="px-3 py-2 border">{u.success ? "✅" : "❌"}</td>
                  <td className="px-3 py-2 border">{u.requestId}</td>
                  <td className="px-3 py-2 border">{u.ipAddress}</td>
                  <td className="px-3 py-2 border">{u.userAgent}</td>
                  <td className="px-3 py-2 border">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Queries Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Queries</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">User ID</th>
                <th className="px-3 py-2 border">Segment ID</th>
                <th className="px-3 py-2 border">Success</th>
                <th className="px-3 py-2 border">Created At</th>
              </tr>
            </thead>
            <tbody>
              {recentQueries.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{q.userId}</td>
                  <td className="px-3 py-2 border">{q.segmentId}</td>
                  <td className="px-3 py-2 border">{q.success ? "✅" : "❌"}</td>
                  <td className="px-3 py-2 border">{new Date(q.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent IPs Table */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Recent IPs / User Agents</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border">IP Address</th>
                <th className="px-3 py-2 border">User Agent</th>
                <th className="px-3 py-2 border">Created At</th>
              </tr>
            </thead>
            <tbody>
              {recentIPs.map(ip => (
                <tr key={ip.createdAt} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{ip.ipAddress}</td>
                  <td className="px-3 py-2 border">{ip.userAgent}</td>
                  <td className="px-3 py-2 border">{new Date(ip.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
