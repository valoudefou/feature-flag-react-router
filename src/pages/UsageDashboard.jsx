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
    const [isLiveUpdate, setIsLiveUpdate] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('checking');
    const [debugInfo, setDebugInfo] = useState([]);
    const [sseEnabled, setSseEnabled] = useState(false);
    const [serverReachable, setServerReachable] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const { user } = useAuth();
    const { theme } = useContext(ThemeContext);

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
        recentIPs: []
    };

    // Add debug logging function
    const addDebugLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
        console.log(`[Dashboard] ${message}`);
    };

    // Simplified server check - just try to fetch data directly
    const checkServerByFetchingData = async () => {
        addDebugLog('Testing server by fetching usage data...');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://live-server1.com/api/usage', {
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

    useEffect(() => {
        let evtSource;
        let retryTimeout;
        let pollInterval;
        let healthCheckInterval;

        async function fetchUsage() {
            addDebugLog('Starting fetch...');
            setError(null);

            // Skip separate health check, just try to fetch data directly
            const result = await checkServerByFetchingData();
            
            if (!result.reachable) {
                addDebugLog('Server unreachable, using offline mode');
                setData(mockData);
                setLastUpdated(new Date());
                setConnectionStatus('offline');
                setLoading(false);
                return;
            }

            // If we got here, the server is reachable and we have data
            try {
                addDebugLog('Server is reachable, using fetched data');
                setConnectionStatus('online');
                setData(result.data);
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
        }

        const connectSSE = () => {
            if (!sseEnabled || !serverReachable) {
                addDebugLog('SSE disabled or server unreachable, skipping connection');
                return;
            }

            // Clear any existing connection
            if (evtSource) {
                addDebugLog('Closing existing SSE connection');
                evtSource.close();
                evtSource = null;
            }

            if (retryTimeout) {
                clearTimeout(retryTimeout);
                retryTimeout = null;
            }

            addDebugLog('Attempting SSE connection...');
            setConnectionStatus('connecting');

            try {
                evtSource = new EventSource('https://live-server1.com/events');
                let connectionEstablished = false;
                let reconnectAttempts = 0;
                const maxReconnectAttempts = 3;

                evtSource.onopen = () => {
                    addDebugLog('SSE connection opened');
                    connectionEstablished = true;
                    reconnectAttempts = 0;
                    setConnectionStatus('connected');
                };

                evtSource.addEventListener('connected', e => {
                    addDebugLog('Received connection confirmation from server');
                    connectionEstablished = true;
                    setConnectionStatus('connected');
                });

                evtSource.addEventListener('heartbeat', e => {
                    if (!connectionEstablished) {
                        connectionEstablished = true;
                        setConnectionStatus('connected');
                    }
                });

                evtSource.addEventListener('upload', e => {
                    addDebugLog('Received upload event');
                    setIsLiveUpdate(true);
                    setTimeout(() => setIsLiveUpdate(false), 3000);

                    try {
                        const eventData = JSON.parse(e.data);
                        setData(prev => {
                            if (!prev) return prev;
                            const totalUploads = prev.metrics.totalUploads + 1;
                            const failedUploads = prev.metrics.failedUploads + (eventData.success ? 0 : 1);
                            return {
                                ...prev,
                                metrics: { ...prev.metrics, totalUploads, failedUploads },
                                recentUploads: [eventData, ...prev.recentUploads].slice(0, 50),
                            };
                        });
                        setLastUpdated(new Date());
                    } catch (err) {
                        addDebugLog(`Error processing upload event: ${err.message}`);
                    }
                });

                evtSource.addEventListener('query', e => {
                    addDebugLog('Received query event');
                    setIsLiveUpdate(true);
                    setTimeout(() => setIsLiveUpdate(false), 3000);

                    try {
                        const eventData = JSON.parse(e.data);
                        setData(prev => {
                            if (!prev) return prev;
                            const totalQueries = prev.metrics.totalQueries + 1;
                            const failedQueries = prev.metrics.failedQueries + (eventData.success ? 0 : 1);
                            return {
                                ...prev,
                                metrics: { ...prev.metrics, totalQueries, failedQueries },
                                recentQueries: [eventData, ...prev.recentQueries].slice(0, 50),
                            };
                        });
                        setLastUpdated(new Date());
                    } catch (err) {
                        addDebugLog(`Error processing query event: ${err.message}`);
                    }
                });

                evtSource.addEventListener('database_change', e => {
                    addDebugLog('Received database_change event - refetching data');
                    setIsLiveUpdate(true);
                    setTimeout(() => setIsLiveUpdate(false), 3000);
                    fetchUsage();
                });

                evtSource.onerror = (err) => {
                    addDebugLog(`SSE error - ReadyState: ${evtSource?.readyState}, Attempts: ${reconnectAttempts}`);
                    setConnectionStatus('disconnected');

                    if (evtSource) {
                        evtSource.close();
                        evtSource = null;
                    }

                    if (reconnectAttempts < maxReconnectAttempts && serverReachable) {
                        reconnectAttempts++;
                        const delay = Math.min(5000 * reconnectAttempts, 30000);
                        addDebugLog(`Will retry SSE connection in ${delay/1000}s (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
                        
                        retryTimeout = setTimeout(() => {
                            if (sseEnabled && serverReachable) {
                                addDebugLog('Retrying SSE connection...');
                                connectSSE();
                            }
                        }, delay);
                    } else {
                        addDebugLog('Max SSE reconnection attempts reached or server unreachable');
                        setConnectionStatus('error');
                        setSseEnabled(false);
                        startPolling();
                    }
                };

            } catch (err) {
                addDebugLog(`SSE setup error: ${err.message}`);
                setConnectionStatus('error');
                setSseEnabled(false);
                startPolling();
            }
        };

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
                fetchUsage();
            }, 60000);
        };

        const startHealthCheck = () => {
            // Check server health every 2 minutes by trying to fetch data
            healthCheckInterval = setInterval(async () => {
                const wasReachable = serverReachable;
                const result = await checkServerByFetchingData();
                
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

        // Initial setup
        addDebugLog('Dashboard initializing...');
        fetchUsage().then(() => {
            if (sseEnabled && serverReachable) {
                addDebugLog('Initial fetch complete, starting SSE...');
                connectSSE();
            } else if (serverReachable) {
                addDebugLog('Initial fetch complete, starting polling...');
                startPolling();
            }
            
            startHealthCheck();
        });

        return () => {
            addDebugLog('Component unmounting, cleaning up');
            
            if (evtSource) {
                evtSource.close();
            }
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
        };
    }, [sseEnabled]);

    const handleRefresh = async () => {
        addDebugLog('Manual refresh triggered');
        setLoading(true);
        setError(null);
        setRetryCount(prev => prev + 1);

        const result = await checkServerByFetchingData();
        
        if (!result.reachable) {
            addDebugLog('Server unreachable during manual refresh');
            setData(mockData);
            setLastUpdated(new Date());
            setConnectionStatus('offline');
            setLoading(false);
            return;
        }

        try {
            setData(result.data);
            setLastUpdated(new Date());
            setError(null);
            setRetryCount(0);
            setConnectionStatus('online');
            addDebugLog('Manual refresh successful');
        } catch (err) {
            addDebugLog(`Manual refresh failed: ${err.message}`);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleSSE = () => {
        const newState = !sseEnabled;
        setSseEnabled(newState);
        addDebugLog(`SSE ${newState ? 'enabled' : 'disabled'} by user`);
    };

    // Rest of your component remains exactly the same...
    // (keeping all the existing JSX and helper functions)

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

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return 'text-green-600';
            case 'connecting': return 'text-yellow-600';
            case 'disconnected': return 'text-red-600';
            case 'error': return 'text-red-600';
            case 'polling': return 'text-blue-600';
            case 'offline': return 'text-gray-600';
            case 'online': return 'text-green-600';
            case 'checking': return 'text-yellow-600';
            default: return 'text-gray-600';
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return 'Live (SSE)';
            case 'connecting': return 'Connecting...';
            case 'disconnected': return 'Reconnecting...';
            case 'error': return 'Connection Error';
            case 'polling': return 'Polling (60s)';
            case 'offline': return 'Offline Mode';
            case 'online': return 'Online';
            case 'checking': return 'Checking...';
            default: return 'Unknown';
        }
    };

    return (
        <div className={`p-6 space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {/* Header with Live Update Indicator */}
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
                        <div className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected' || connectionStatus === 'online' ? 'bg-green-500' :
                            connectionStatus === 'connecting' || connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                            connectionStatus === 'polling' ? 'bg-blue-500 animate-pulse' :
                            connectionStatus === 'offline' ? 'bg-gray-500' :
                            'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">{getConnectionStatusText()}</span>
                    </div>

                    {/* Live Update Indicator */}
                    {isLiveUpdate && (
                        <div className="flex items-center gap-2 text-green-600 animate-pulse">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                            <span className="text-sm font-medium">Live Update</span>
                        </div>
                    )}

                    {/* SSE Toggle Button - only show if server is reachable */}
                    {serverReachable && (
                        <button
                            onClick={toggleSSE}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                                sseEnabled
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                        >
                            {sseEnabled ? 'Disable SSE' : 'Enable SSE'}
                        </button>
                    )}

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

            {/* Rest of your dashboard components remain exactly the same */}
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
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Success" fill="#4ade80" />
                            <Bar dataKey="Failed" fill="#f87171" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent sections with empty state handling */}
            <div className="flex flex-col gap-4">
                <p className="text-lg font-semibold mb-2">Recent Uploads</p>
                {recentUploads && recentUploads.length > 0 ? recentUploads.map(u => (
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
                        {connectionStatus === 'offline' ? 'No data available (offline mode)' : 'No recent uploads'}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-4">
                <p className="text-lg font-semibold mb-2">Recent Queries</p>
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

            <div className="flex flex-col gap-4">
                <p className="text-lg font-semibold mb-2">Recent IPs / User Agents</p>
                {recentIPs && recentIPs.length > 0 ? recentIPs.map(ip => (
                    <div key={ip.createdAt} className={cardStyle}>
                        <div className="font-mono text-sm">{ip.ipAddress}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{ip.userAgent}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(ip.createdAt).toLocaleString()}</div>
                    </div>
                )) : (
                    <p className="text-gray-500">
                        {connectionStatus === 'offline' ? 'No data available (offline mode)' : 'No recent IP data'}
                    </p>
                )}
            </div>
        </div>
    );
}
