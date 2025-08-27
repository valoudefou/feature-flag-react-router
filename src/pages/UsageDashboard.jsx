import { useState, useEffect, useContext, useMemo, useRef } from 'react';
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

// Custom hooks for better separation of concerns
const useServerConnection = () => {
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [serverReachable, setServerReachable] = useState(null);
    
    const checkServer = async (filters = {}, signal = null) => {
        try {
            const queryParams = new URLSearchParams(filters);
            const url = `http://localhost:3001/api/usage${queryParams.toString() ? `?${queryParams}` : ''}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            return { reachable: true, data };
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            return { reachable: false, data: null };
        }
    };
    
    return { connectionStatus, setConnectionStatus, serverReachable, setServerReachable, checkServer };
};

const useDebugLogger = () => {
    const [debugInfo, setDebugInfo] = useState([]);
    
    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
        console.log(`[Dashboard] ${message}`);
    };
    
    return { debugInfo, addLog };
};

// Components
const LoadingSpinner = ({ serverReachable, debugInfo, onRefresh }) => (
    <div className="p-4 flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
        <p>Loading usage data...</p>
        <p className="text-sm text-gray-500 mt-2">
            {serverReachable === false ? 'Server unreachable - will use offline mode' : 'Checking server connection...'}
        </p>
        <DebugPanel debugInfo={debugInfo} onRefresh={onRefresh} />
    </div>
);

const ErrorDisplay = ({ error, retryCount, debugInfo, onRefresh }) => (
    <div className="p-4 text-center">
        <p className="text-red-500 mb-4">Error: {error}</p>
        {retryCount > 0 && <p className="text-sm text-gray-500 mb-4">Retry attempts: {retryCount}</p>}
        <DebugPanel debugInfo={debugInfo} onRefresh={onRefresh} />
        <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
            Retry ({retryCount > 0 ? `${retryCount} attempts` : 'Try Again'})
        </button>
    </div>
);

const DebugPanel = ({ debugInfo, onRefresh }) => (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg w-full max-w-2xl">
        <h3 className="font-bold mb-2">Debug Information:</h3>
        <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
            {debugInfo.map((log, index) => (
                <div key={index} className="font-mono">{log}</div>
            ))}
        </div>
        {onRefresh && (
            <button
                onClick={onRefresh}
                className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded"
            >
                Test Server Connection
            </button>
        )}
    </div>
);

const StatusIndicator = ({ connectionStatus, serverReachable }) => {
    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'polling': return 'text-blue-600';
            case 'offline': return 'text-gray-600';
            case 'online': return 'text-green-600';
            case 'checking': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'polling': return 'Polling (60s)';
            case 'offline': return 'Offline Mode';
            case 'online': return 'Online';
            case 'checking': return 'Checking...';
            default: return 'Unknown';
        }
    };

    const getDotColor = () => {
        switch (connectionStatus) {
            case 'online': return 'bg-green-500';
            case 'checking': return 'bg-yellow-500 animate-pulse';
            case 'polling': return 'bg-blue-500 animate-pulse';
            case 'offline': return 'bg-gray-500';
            default: return 'bg-red-500';
        }
    };

    return (
        <div className="flex items-center gap-4">
            {serverReachable === false && (
                <div className="flex items-center gap-2 text-orange-600">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium">Server Offline</span>
                </div>
            )}
            <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                <div className={`w-2 h-2 rounded-full ${getDotColor()}`}></div>
                <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
        </div>
    );
};

const MetricsCards = ({ metrics, cardStyle }) => (
    <div className="flex flex-wrap gap-4">
        <MetricCard 
            title="Total Uploads" 
            value={metrics.totalUploads} 
            borderColor="border-green-500" 
            cardStyle={cardStyle} 
        />
        <MetricCard 
            title="Failed Uploads" 
            value={metrics.failedUploads} 
            borderColor="border-red-500" 
            cardStyle={cardStyle} 
        />
        <MetricCard 
            title="Total Queries" 
            value={metrics.totalQueries} 
            borderColor="border-green-500" 
            cardStyle={cardStyle} 
        />
        <MetricCard 
            title="Failed Queries" 
            value={metrics.failedQueries} 
            borderColor="border-red-500" 
            cardStyle={cardStyle} 
        />
    </div>
);

const MetricCard = ({ title, value, borderColor, cardStyle }) => (
    <div className={`${cardStyle} flex-1 border-l-4 ${borderColor}`}>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);

const FilterButtons = ({ uploadFilter, onFilterChange, loading }) => (
    <div className="flex gap-2">
        {[
            { key: 'all', label: 'All', color: 'bg-blue-500' },
            { key: 'success', label: 'Success Only', color: 'bg-green-500' },
            { key: 'failed', label: 'Failed Only', color: 'bg-red-500' }
        ].map(({ key, label, color }) => (
            <button
                key={key}
                onClick={() => onFilterChange(key)}
                disabled={loading}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                    uploadFilter === key
                        ? `${color} text-white`
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {loading && uploadFilter === key ? 'Loading...' : label}
            </button>
        ))}
    </div>
);

// Main component
export default function UsageDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [uploadFilter, setUploadFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('uploads');

    const { user } = useAuth();
    const { theme } = useContext(ThemeContext);
    const { connectionStatus, setConnectionStatus, serverReachable, setServerReachable, checkServer } = useServerConnection();
    const { debugInfo, addLog } = useDebugLogger();

    const isInitialMount = useRef(true);
    const abortControllerRef = useRef(null);

    const mockData = {
        metrics: { totalUploads: 0, failedUploads: 0, totalQueries: 0, failedQueries: 0 },
        recentUploads: [],
        recentQueries: [],
        recentIPs: []
    };

    const displayUploads = useMemo(() => {
        return data?.recentUploads || [];
    }, [data?.recentUploads]);

    const fetchUsage = async (filters = {}) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        addLog('Starting fetch...');
        setError(null);

        const result = await checkServer(filters, abortControllerRef.current.signal);

        if (!result.reachable) {
            addLog('Server unreachable, using offline mode');
            setData(mockData);
            setConnectionStatus('offline');
            setServerReachable(false);
        } else {
            addLog('Server is reachable, using fetched data');
            setConnectionStatus('online');
            setData(result.data);
            setServerReachable(true);
            setRetryCount(0);
        }

        setLastUpdated(new Date());
        setLoading(false);
        abortControllerRef.current = null;
    };

    const handleUploadFilterChange = async (newFilter) => {
        setData(null);
        setUploadFilter(newFilter);
        setLoading(true);
        addLog(`Filter changing to ${newFilter}`);
        
        try {
            await fetchUsage({ uploadFilter: newFilter });
            addLog(`Filter change to ${newFilter} completed`);
        } catch (error) {
            addLog(`Filter change failed: ${error.message}`);
        }
    };

    const handleRefresh = async () => {
        addLog('Manual refresh triggered');
        setLoading(true);
        setError(null);
        setRetryCount(prev => prev + 1);
        await fetchUsage({ uploadFilter });
    };

    // Initial load and polling
    useEffect(() => {
        if (isInitialMount.current) {
            addLog('Dashboard initializing...');
            fetchUsage({ uploadFilter: 'all' });
            isInitialMount.current = false;
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    if (loading && !data) {
        return <LoadingSpinner serverReachable={serverReachable} debugInfo={debugInfo} onRefresh={handleRefresh} />;
    }

    if (error && !data) {
        return <ErrorDisplay error={error} retryCount={retryCount} debugInfo={debugInfo} onRefresh={handleRefresh} />;
    }

    if (!data) return null;

    const { metrics, recentUploads, recentQueries, recentIPs } = data;
    const cardStyle = 'bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow';

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

    return (
        <div className={`p-6 space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Usage Dashboard</h1>
                <div className="flex items-center gap-4">
                    <StatusIndicator connectionStatus={connectionStatus} serverReachable={serverReachable} />
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    {lastUpdated && (
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            </div>

            {/* Status Banners */}
            {connectionStatus === 'offline' && (
                <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
                    <p className="font-bold">Offline Mode</p>
                    <p>Server is unreachable. Data will update when server comes back online.</p>
                </div>
            )}

            {/* Metrics */}
            <MetricsCards metrics={metrics} cardStyle={cardStyle} />

            {/* Charts */}
            <div className="flex flex-wrap gap-6">
                <div className={`${cardStyle} flex-1 min-w-[300px]`}>
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
                <div className={`${cardStyle} flex-1 min-w-[300px]`}>
                    <p className="text-lg font-semibold mb-2">Queries (Success vs Failed)</p>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={queriesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Legend />
                            <Bar dataKey="Success" fill="#4ade80" />
                            <Bar dataKey="Failed" fill="#f87171" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                {[
                    { key: 'uploads', label: `Uploads (${displayUploads?.length || 0})` },
                    { key: 'queries', label: `Queries (${recentQueries?.length || 0})` },
                    { key: 'ips', label: `IPs/Agents (${recentIPs?.length || 0})` }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === key
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'uploads' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold">Recent Uploads</p>
                        <FilterButtons 
                            uploadFilter={uploadFilter} 
                            onFilterChange={handleUploadFilterChange} 
                            loading={loading} 
                        />
                    </div>

                    <div className="grid gap-4">
                        {displayUploads?.length > 0 ? displayUploads.map(u => (
                            <div key={u.chunkId + u.timestamp} className={cardStyle}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-sm truncate">{u.chunkId}</span>
                                    {badge(u.success)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    Size: {u.sizeMB || u.size} MB | RequestID: {u.requestId}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">IP: {u.ipAddress}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300 truncate">UA: {u.userAgent}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                    {new Date(u.timestamp || u.createdAt).toLocaleString()}
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500">
                                {connectionStatus === 'offline' ? 'No data available (offline mode)' : 'No recent uploads'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Similar structure for queries and ips tabs... */}
        </div>
    );
}
