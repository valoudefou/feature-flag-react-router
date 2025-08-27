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

export default function UsageDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [debugInfo, setDebugInfo] = useState([]);
    const [serverReachable, setServerReachable] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // New filter states
    const [uploadFilter, setUploadFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('uploads');

    const { user } = useAuth();
    const { theme } = useContext(ThemeContext);

    // Add ref to track if component is mounted
    const isInitialMount = useRef(true);

    // MOVED: displayUploads useMemo hook to the top, right after state and context
    const displayUploads = useMemo(() => {
        console.log('=== RENDER DEBUG ===');
        console.log('uploadFilter state:', uploadFilter);
        
        // Handle case when data is not loaded yet
        if (!data?.recentUploads) {
            console.log('No data available yet');
            return [];
        }
        
        const recentUploads = data.recentUploads;
        console.log('recentUploads length:', recentUploads?.length);
        console.log('recentUploads data:', recentUploads?.map(u => ({ id: u.id, success: u.success })));
        
        // Apply client-side filtering as backup to ensure correct display
        switch (uploadFilter) {
            case 'failed':
                const failed = recentUploads.filter(upload => upload.success === false);
                console.log('Client-filtered failed uploads:', failed.length);
                return failed;
            case 'success':
                const successful = recentUploads.filter(upload => upload.success === true);
                console.log('Client-filtered successful uploads:', successful.length);
                return successful;
            default:
                return recentUploads;
        }
    }, [data?.recentUploads, uploadFilter]);

    useEffect(() => {
        console.log('uploadFilter state changed to:', uploadFilter);
    }, [uploadFilter]);

    // Mock data for when server is unreachable
    const mockData = {
        metrics: {
            totalUploads: 0,
            failedUploads: 0,
            totalQueries: 0,
            failedQueries: 0
        },
        recentUploads: [],
        recentQueries: [],
        recentIPs: [],
        filters: {
            uploadFilter: 'all',
            limit: 50
        }
    };

    // Add debug logging function
    const addDebugLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
        console.log(`[Dashboard] ${message}`);
    };

    // Fetch data with filters
    const checkServerByFetchingData = async (filters = {}) => {
        const queryParams = new URLSearchParams({
            uploadFilter: filters.uploadFilter || uploadFilter,
            limit: '50'
        });

        addDebugLog(`Testing server with filters: ${queryParams.toString()}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://live-server1.com/api/usage?${queryParams}`, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                addDebugLog('Server is reachable via /api/usage');
                setServerReachable(true);
                return { reachable: true, data: await response.json() };
            } else {
                addDebugLog(`Server responded with error: ${response.status}`);
                setServerReachable(false);
                return { reachable: false, data: null };
            }
        } catch (err) {
            addDebugLog(`Server test failed: ${err.message}`);
            setServerReachable(false);
            return { reachable: false, data: null };
        }
    };

    // Fetch usage data
    const fetchUsage = async (filters = {}) => {
        addDebugLog('Starting fetch...');
        setError(null);

        const result = await checkServerByFetchingData(filters);

        if (!result.reachable) {
            addDebugLog('Server unreachable, using offline mode');
            setData(mockData);
            setLastUpdated(new Date());
            setConnectionStatus('offline');
            setLoading(false);
            return;
        }

        try {
            addDebugLog('Server is reachable, using fetched data');
            setConnectionStatus('online');
            setData(result.data);
            console.log('=== FRONTEND DEBUG ===');
            console.log('Filter requested:', filters.uploadFilter || uploadFilter);
            console.log('Server response uploads:', result.data.recentUploads);
            console.log('Upload success distribution:', {
                total: result.data.recentUploads?.length || 0,
                successful: result.data.recentUploads?.filter(u => u.success).length || 0,
                failed: result.data.recentUploads?.filter(u => !u.success).length || 0
            });
            console.log('Current uploadFilter state:', uploadFilter);
            setLastUpdated(new Date());
            setError(null);
            setRetryCount(0);
            addDebugLog('Data fetched successfully');
            setServerReachable(true);

        } catch (err) {
            addDebugLog(`Data processing error: ${err.message}`);
            setError('Error processing server data');
            setData(mockData);
            setConnectionStatus('offline');
            setServerReachable(false);
        } finally {
            setLoading(false);
        }
    };


// Handle filter changes
const handleUploadFilterChange = (newFilter) => {
    console.log('Filter change requested:', newFilter);
    
    // Update state first
    setUploadFilter(newFilter);
    setLoading(true);

    // Use setTimeout to ensure state update has been processed
    setTimeout(() => {
        fetchUsage({ uploadFilter: newFilter });
    }, 0);
};


    // FIXED: Separate the initial load from filter changes
    useEffect(() => {
        let pollInterval;
        let healthCheckInterval;

        const startPolling = () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }

            if (!serverReachable) {
                addDebugLog('Server unreachable, skipping polling');
                setConnectionStatus('offline');
                return;
            }

            addDebugLog('Starting polling mode (60s intervals)');
            setConnectionStatus('polling');

            pollInterval = setInterval(() => {
                addDebugLog('Polling for updates...');
                // Use the current uploadFilter state for polling
                fetchUsage({ uploadFilter });
            }, 60000);
        };

        const startHealthCheck = () => {
            healthCheckInterval = setInterval(async () => {
                const wasReachable = serverReachable;
                const result = await checkServerByFetchingData({ uploadFilter });

                if (!wasReachable && result.reachable) {
                    addDebugLog('Server came back online, updating data');
                    setData(result.data);
                    setLastUpdated(new Date());
                    setConnectionStatus('online');
                } else if (wasReachable && !result.reachable) {
                    addDebugLog('Server went offline');
                    setConnectionStatus('offline');
                }
            }, 120000);
        };

        // ONLY run initial setup on first mount
        if (isInitialMount.current) {
            addDebugLog('Dashboard initializing...');
            fetchUsage({ uploadFilter: 'all' }).then(() => {
                if (serverReachable) {
                    addDebugLog('Initial fetch complete, starting polling...');
                    startPolling();
                }
                startHealthCheck();
            });
            isInitialMount.current = false;
        } else {
            // For subsequent filter changes, just restart polling with new filter
            if (serverReachable) {
                startPolling();
            }
        }

        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
        };
    }, [uploadFilter, serverReachable]); // Keep uploadFilter as dependency but handle it properly

    const handleRefresh = async () => {
        addDebugLog('Manual refresh triggered');
        setLoading(true);
        setError(null);
        setRetryCount(prev => prev + 1);
        await fetchUsage({ uploadFilter });
    };

    // Rest of your component remains the same...
    if (loading && !data) {
        return (
            <div className="p-4 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p>Loading usage data...</p>
                <p className="text-sm text-gray-500 mt-2">
                    {serverReachable === false ? 'Server unreachable - will use offline mode' : 'Checking server connection...'}
                </p>

                <div className="mt-4 p-4 bg-gray-100 rounded-lg w-full max-w-2xl">
                    <h3 className="font-bold mb-2">Debug Information:</h3>
                    <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                        {debugInfo.map((log, index) => (
                            <div key={index} className="font-mono">{log}</div>
                        ))}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded"
                    >
                        Test Server Connection
                    </button>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500 mb-4">Error: {error}</p>
                {retryCount > 0 && (
                    <p className="text-sm text-gray-500 mb-4">Retry attempts: {retryCount}</p>
                )}

                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-bold mb-2">Debug Information:</h3>
                    <div className="text-xs space-y-1 max-h-40 overflow-y-auto text-left">
                        {debugInfo.map((log, index) => (
                            <div key={index} className="font-mono">{log}</div>
                        ))}
                    </div>
                </div>

                <div className="space-x-2">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        Retry ({retryCount > 0 ? `${retryCount} attempts` : 'Try Again'})
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Data destructuring happens AFTER all early returns and hooks
    const { metrics, recentUploads, recentQueries, recentIPs } = data;

    // Rest of your JSX remains exactly the same...
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

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'polling': return 'text-blue-600';
            case 'offline': return 'text-gray-600';
            case 'online': return 'text-green-600';
            case 'checking': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'polling': return 'Polling (60s)';
            case 'offline': return 'Offline Mode';
            case 'online': return 'Online';
            case 'checking': return 'Checking...';
            default: return 'Unknown';
        }
    };

    return (
        <div className={`p-6 space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {/* All your existing JSX remains the same */}
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Usage Dashboard</h1>
                <div className="flex items-center gap-4">
                    {/* Server Status */}
                    {serverReachable === false && (
                        <div className="flex items-center gap-2 text-orange-600">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">Server Offline</span>
                        </div>
                    )}

                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'online' ? 'bg-green-500' :
                                connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                                    connectionStatus === 'polling' ? 'bg-blue-500 animate-pulse' :
                                        connectionStatus === 'offline' ? 'bg-gray-500' :
                                            'bg-red-500'
                            }`}></div>
                        <span className="text-sm font-medium">{getConnectionStatusText()}</span>
                    </div>

                    {/* Manual Refresh Button */}
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

            {/* Rest of your JSX... */}
            {/* I'll include the rest for completeness but it's identical to your current code */}
            
            {/* Offline Mode Banner */}
            {connectionStatus === 'offline' && (
                <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
                    <p className="font-bold">Offline Mode</p>
                    <p>Server is unreachable. Showing empty dashboard. Data will update when server comes back online.</p>
                </div>
            )}

            {/* Debug Panel (collapsible) */}
            <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Debug Information ({debugInfo.length} logs) {retryCount > 0 && `- ${retryCount} retries`}
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                    {debugInfo.map((log, index) => (
                        <div key={index} className="font-mono">{log}</div>
                    ))}
                </div>
            </details>

            {/* Error Banner */}
            {error && data && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                    <p className="font-bold">Warning</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="flex flex-wrap gap-4">
                <div className={`${cardStyle} flex-1 border-l-4 border-green-500`}>
                    <p className="text-sm font-medium">Total Uploads</p>
                    <p className="text-2xl font-bold">{metrics.totalUploads}</p>
                </div>
                <div className={`${cardStyle} flex-1 border-l-4 border-red-500`}>
                    <p className="text-sm font-medium">Failed Uploads</p>
                    <p className="text-2xl font-bold">{metrics.failedUploads}</p>
                </div>
                <div className={`${cardStyle} flex-1 border-l-4 border-green-500`}>
                    <p className="text-sm font-medium">Total Queries</p>
                    <p className="text-2xl font-bold">{metrics.totalQueries}</p>
                </div>
                <div className={`${cardStyle} flex-1 border-l-4 border-red-500`}>
                    <p className="text-sm font-medium">Failed Queries</p>
                    <p className="text-2xl font-bold">{metrics.failedQueries}</p>
                </div>
            </div>

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
                <button
                    onClick={() => setActiveTab('uploads')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'uploads'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    Uploads ({displayUploads?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('queries')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'queries'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    Queries ({recentQueries?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('ips')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ips'
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                >
                    IPs/Agents ({recentIPs?.length || 0})
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'uploads' && (
                <div className="space-y-4">
                    {/* Upload Filter */}
                    <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold">Recent Uploads</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUploadFilterChange('all')}
                                className={`px-3 py-1 text-sm rounded transition-colors ${uploadFilter === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => handleUploadFilterChange('success')}
                                className={`px-3 py-1 text-sm rounded transition-colors ${uploadFilter === 'success'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                    }`}
                            >
                                Success Only
                            </button>
                            <button
                                className={`px-4 py-2 rounded-lg transition-colors ${uploadFilter === 'failed'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                onClick={() => handleUploadFilterChange('failed')}
                            >
                                Failed Only
                            </button>
                        </div>
                    </div>

                    {/* Upload List */}
                    <div className="grid gap-4">
                        {displayUploads && displayUploads.length > 0 ? displayUploads.map(u => (
                            <div key={u.chunkId + u.timestamp} className={cardStyle}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-sm truncate">{u.chunkId}</span>
                                    {badge(u.success)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">Size: {u.sizeMB || u.size} MB | RequestID: {u.requestId}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">IP: {u.ipAddress}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300 truncate">UA: {u.userAgent}</div>
                                <div className="text-xs text-gray-400 mt-1">{new Date(u.timestamp || u.createdAt).toLocaleString()}</div>
                            </div>
                        )) : (
                            <p className="text-gray-500">
                                {connectionStatus === 'offline' ? 'No data available (offline mode)' :
                                    uploadFilter === 'failed' ? 'No failed uploads found' :
                                        uploadFilter === 'success' ? 'No successful uploads found' :
                                            'No recent uploads'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'queries' && (
                <div className="space-y-4">
                    <p className="text-lg font-semibold">Recent Queries</p>
                    <div className="grid gap-4">
                        {recentQueries && recentQueries.length > 0 ? recentQueries.map(q => (
                            <div key={q.segmentId + q.timestamp} className={cardStyle}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-mono text-sm truncate">UserID: {q.userId}</span>
                                    {badge(q.success)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300 truncate">SegmentID: {q.segmentId}</div>
                                <div className="text-xs text-gray-400 mt-1">{new Date(q.timestamp || q.createdAt).toLocaleString()}</div>
                            </div>
                        )) : (
                            <p className="text-gray-500">
                                {connectionStatus === 'offline' ? 'No data available (offline mode)' : 'No recent queries'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'ips' && (
                <div className="space-y-4">
                    <p className="text-lg font-semibold">Recent IPs / User Agents (Most Active First)</p>
                    <div className="grid gap-4">
                        {recentIPs && recentIPs.length > 0 ? recentIPs.map((ip, index) => (
                            <div key={`${ip.ipAddress}-${ip.userAgent}-${index}`} className={cardStyle}>
                                <div className="flex justify-between items-center mb-1">
                                    <div className="font-mono text-sm">{ip.ipAddress}</div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                                        {ip.count} records
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{ip.userAgent}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Last seen: {new Date(ip.lastSeen || ip.createdAt).toLocaleString()}
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500">
                                {connectionStatus === 'offline' ? 'No data available (offline mode)' : 'No recent IP data'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
