import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';

const UsageDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);


    // Get filter values from URL params
    const uploadFilter = searchParams.get('uploadFilter') || 'all';
    const limit = parseInt(searchParams.get('limit')) || 50;

    // API Base URL - Updated to use your live server
    const API_BASE_URL = 'https://live-server1.com';

    // Fetch dashboard data
const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        console.log(`Fetching data from: ${API_BASE_URL}/api/usage?uploadFilter=${uploadFilter}&limit=${limit}`);

        const response = await fetch(`${API_BASE_URL}/api/usage?uploadFilter=${uploadFilter}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add any additional headers if needed for CORS or authentication
            },
            // Add credentials if your API requires authentication
            // credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        setDashboardData(data);
        setError(null);
        setIsOnline(true); // Set online when API call succeeds
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(`Failed to fetch data: ${err.message}`);
        setIsOnline(false); // Set offline when API call fails
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
}, [uploadFilter, limit, API_BASE_URL]);


    // Update URL params
    const updateFilter = useCallback((key, value) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set(key, value);
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    // Fetch data on component mount and when URL params change
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // Memoized chart data
    const chartData = useMemo(() => {
        if (!dashboardData) return null;

        const { metrics } = dashboardData;
        const successfulUploads = metrics.totalUploads - metrics.failedUploads;
        const successfulQueries = metrics.totalQueries - metrics.failedQueries;

        return {
            uploadSuccess: [
                { name: 'Successful', value: successfulUploads, color: '#10B981' },
                { name: 'Failed', value: metrics.failedUploads, color: '#EF4444' }
            ],
            querySuccess: [
                { name: 'Successful', value: successfulQueries, color: '#3B82F6' },
                { name: 'Failed', value: metrics.failedQueries, color: '#F59E0B' }
            ],
            overview: [
                { name: 'Total Uploads', value: metrics.totalUploads },
                { name: 'Failed Uploads', value: metrics.failedUploads },
                { name: 'Total Queries', value: metrics.totalQueries },
                { name: 'Failed Queries', value: metrics.failedQueries }
            ]
        };
    }, [dashboardData]);

    // Helper functions
    const formatDate = useCallback((dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const formatFileSize = useCallback((bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    const getBrowserInfo = useCallback((userAgent) => {
        if (!userAgent) return { browser: 'Unknown', device: 'desktop' };

        let browser = 'Unknown';
        let device = 'desktop';

        if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('CriOS')) browser = 'Chrome iOS';

        if (userAgent.includes('Mobile') || userAgent.includes('iPhone')) device = 'mobile';
        else if (userAgent.includes('iPad')) device = 'tablet';

        return { browser, device };
    }, []);

    const getDeviceIcon = useCallback((device) => {
        switch (device) {
            case 'mobile': return '📱';
            case 'tablet': return '📱';
            default: return '💻';
        }
    }, []);

    if (loading && !dashboardData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                    <p className="text-sm text-gray-500 mt-2">Connecting to {API_BASE_URL}</p>
                </div>
            </div>
        );
    }

    if (error && !dashboardData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-500 mb-4">API URL: {API_BASE_URL}/api/usage</p>
                    <button
                        onClick={() => fetchDashboardData()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">No data available</div>
            </div>
        );
    }

    const { metrics, recentUploads, recentQueries, recentIPs } = dashboardData;

    return (
       <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center py-4">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Usage Dashboard</h1>

      <div className="flex items-center space-x-6">
        {/* Status pill */}
        <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          <span className="w-2 h-2 mr-2 rounded-full bg-current" />
          {isOnline ? "Online" : "Offline"}
        </div>

        {/* Last Updated */}
        <span className="text-xs text-gray-500">⏱ {new Date().toLocaleTimeString()}</span>

        {/* Refresh */}
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm transition-all"
        >
          <span className={refreshing ? "animate-spin" : ""}>🔄</span>
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </div>
  </div>
</header>

    );
};

export default UsageDashboard;
