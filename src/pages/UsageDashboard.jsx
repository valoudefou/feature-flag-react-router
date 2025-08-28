import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Line,
    Area,
    AreaChart
} from 'recharts';

// Modern Icons Component
const Icons = {
    Upload: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    ),
    Search: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    Error: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Refresh: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    ),
    Filter: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
        </svg>
    ),
    TrendingUp: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
    ),
    Globe: () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9a9 9 0 00-9 9m9-9v9m0-9a9 9 0 019 9m-9 9a9 9 0 01-9-9" />
        </svg>
    )
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
    <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-100 rounded"></div>
                </div>
            ))}
        </div>
    </div>
);

// Status Badge Component
const StatusBadge = ({ success, type = 'default', errorMessage }) => {
    const variants = {
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        error: 'bg-red-50 text-red-700 border-red-200',
        default: success
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variants[type] || variants.default}`}
            title={!success && errorMessage ? errorMessage : undefined} // <-- show tooltip only on failure
        >
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${success ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            {success ? 'Success' : 'Failed'}
        </span>
    );
};


// Metric Card Component
const MetricCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => {
    const colorVariants = {
        blue: 'text-blue-600',
        green: 'text-emerald-600',
        red: 'text-red-600',
        yellow: 'text-amber-600',
        purple: 'text-purple-600'
    };

    return (
           <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
                <div className={`${colorVariants[color]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon />
                </div>
                {trend && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <div className="space-y-2">
                <p className="text-4xl font-black text-gray-900 leading-none">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{title}</p>
            </div>
        </div>
    );
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="font-medium text-gray-900">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const UsageDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Get filter values from URL params
    const uploadFilter = searchParams.get('uploadFilter') || 'all';
    const limit = parseInt(searchParams.get('limit')) || 50;

    // API Base URL
    const API_BASE_URL = 'https://live-server1.com';

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await fetch(`${API_BASE_URL}/api/usage?uploadFilter=${uploadFilter}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            setDashboardData(data);
            setError(null);
            setIsOnline(true);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(`Failed to fetch data: ${err.message}`);
            setIsOnline(false);
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
                { name: 'Uploads', successful: successfulUploads, failed: metrics.failedUploads },
                { name: 'Queries', successful: successfulQueries, failed: metrics.failedQueries }
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
        if (!userAgent) return { browser: 'Unknown', device: 'desktop', icon: '💻' };

        let browser = 'Unknown';
        let device = 'desktop';
        let icon = '💻';

        if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';

        if (userAgent.includes('Mobile') || userAgent.includes('iPhone')) {
            device = 'mobile';
            icon = '📱';
        } else if (userAgent.includes('iPad')) {
            device = 'tablet';
            icon = '📱';
        }

        return { browser, device, icon };
    }, []);

    // Loading state
    if (loading && !dashboardData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-96"></div>
                    </div>
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }

    // Error state
    if (error && !dashboardData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md border border-gray-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Error />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <p className="text-sm text-gray-500 mb-6">API: {API_BASE_URL}/api/usage</p>
                    <button
                        onClick={() => fetchDashboardData()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-gray-500">No data available</div>
            </div>
        );
    }

    const { metrics, recentUploads, recentQueries, recentIPs } = dashboardData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Modern Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                Usage Dashboard
                            </h1>
                            <p className="text-gray-600 mt-1">Real-time analytics and monitoring</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Connection Status */}
                            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                <span className={`text-sm font-medium ${isOnline ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {isOnline ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>

                            {/* Last Updated */}
                            <div className="text-sm text-gray-500 hidden sm:block">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={() => fetchDashboardData(true)}
                                disabled={refreshing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                <span className={refreshing ? 'animate-spin' : ''}>
                                    <Icons.Refresh />
                                </span>
                                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Enhanced Filters */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 mb-8">
                    <div className="flex items-center space-x-2 mb-4">
                        <Icons.Filter />
                        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Status</label>
                            <select
                                value={uploadFilter}
                                onChange={(e) => updateFilter('uploadFilter', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                                <option value="all">All Uploads</option>
                                <option value="success">Successful Only</option>
                                <option value="failed">Failed Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Records Limit</label>
                            <select
                                value={limit}
                                onChange={(e) => updateFilter('limit', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                                <option value="25">25 Records</option>
                                <option value="50">50 Records</option>
                                <option value="100">100 Records</option>
                                <option value="200">200 Records</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Enhanced Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        title="Total Uploads"
                        value={metrics.totalUploads}
                        icon={Icons.Upload}
                        color="blue"
                        trend="+12%"
                    />
                    <MetricCard
                        title="Failed Uploads"
                        value={metrics.failedUploads}
                        icon={Icons.Error}
                        color="red"
                    />
                    <MetricCard
                        title="Total Queries"
                        value={metrics.totalQueries}
                        icon={Icons.Search}
                        color="green"
                        trend="+8%"
                    />
                    <MetricCard
                        title="Failed Queries"
                        value={metrics.failedQueries}
                        icon={Icons.Error}
                        color="yellow"
                    />
                </div>

                {/* Enhanced Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Stacked Bar Chart */}
                    <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Success vs Failure Rate</h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={chartData?.overview} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                                <YAxis stroke="#6B7280" fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="successful" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Enhanced Donut Chart */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Upload Distribution</h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={chartData?.uploadSuccess}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData?.uploadSuccess.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center space-x-6 mt-4">
                            {chartData?.uploadSuccess.map((entry, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-sm text-gray-600">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Enhanced Data Tables */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    {/* Recent Uploads */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200/50 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Recent Uploads ({recentUploads.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200/50">
                                    {recentUploads.slice(0, 10).map((upload) => (
                                        <tr key={upload.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                               <StatusBadge success={upload.success} errorMessage={upload.error} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatFileSize(upload.size)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {upload.totalChunks}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(upload.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Queries */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200/50 bg-gray-50/50">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Recent Queries ({recentQueries.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200/50">
                                    {recentQueries.slice(0, 10).map((query) => (
                                        <tr key={query.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge success={query.success} errorMessage={query.error} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {query.userId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                                    {query.segmentId.length > 15 ? query.segmentId.substring(0, 15) + '...' : query.segmentId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(query.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Enhanced IP Activity */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200/50 bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <Icons.Globe />

                            <h3 className="text-lg font-semibold text-gray-900">
                                Recent IP Activity ({recentIPs.length})
                            </h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser & Device</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/50">
                                {recentIPs.map((ip, index) => {
                                    const browserInfo = getBrowserInfo(ip.userAgent);
                                    return (
                                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                                    {ip.ipAddress}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">{browserInfo.icon}</span>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{browserInfo.browser}</div>
                                                        <div className="text-xs text-gray-500 capitalize">{browserInfo.device}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <div className="text-xs text-gray-500 font-mono truncate" title={ip.userAgent}>
                                                    {ip.userAgent}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                    {ip.count} requests
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(ip.lastSeen)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UsageDashboard;
