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
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [debugInfo, setDebugInfo] = useState([]); // Add debug info

    const { user } = useAuth();
    const { theme } = useContext(ThemeContext);

    // Add debug logging function
    const addDebugLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
        console.log(`[Dashboard] ${message}`);
    };

    useEffect(() => {
        let evtSource;
        let retryTimeout;

        async function fetchUsage() {
            addDebugLog('Starting fetch...');
            setLoading(true);
            setError(null);
            
            try {
                // First, let's test if the server is reachable
                addDebugLog('Testing server connectivity...');
                
                const res = await fetch("https://live-server1.com/api/usage", {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    // Remove timeout for now to see if it's a timeout issue
                });
                
                addDebugLog(`Server responded with status: ${res.status}`);
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                const text = await res.text();
                addDebugLog(`Received response: ${text.substring(0, 100)}...`);
                
                let json;
                try {
                    json = JSON.parse(text);
                } catch (parseError) {
                    addDebugLog(`JSON parse error: ${parseError.message}`);
                    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
                }
                
                setData(json);
                setLastUpdated(new Date());
                setError(null);
                addDebugLog('Data fetched successfully');
                
            } catch (err) {
                addDebugLog(`Fetch error: ${err.message}`);
                console.error("Usage fetch error:", err);
                
                // More specific error messages
                if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                    setError('Cannot connect to server - check if https://live-server1.com is running');
                } else if (err.name === 'AbortError') {
                    setError('Request timeout - server is too slow');
                } else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        }

        const connectSSE = () => {
            addDebugLog('Attempting SSE connection...');
            setConnectionStatus('connecting');
            
            try {
                evtSource = new EventSource('https://live-server1.com/events');

                evtSource.onopen = () => {
                    addDebugLog('SSE connected successfully');
                    setConnectionStatus('connected');
                };

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

                evtSource.addEventListener('heartbeat', e => {
                    addDebugLog('SSE heartbeat received');
                });

                evtSource.onerror = (err) => {
                    addDebugLog(`SSE error occurred`);
                    setConnectionStatus('disconnected');
                    
                    if (evtSource) {
                        evtSource.close();
                    }
                    
                    // Retry after 10 seconds instead of 5
                    retryTimeout = setTimeout(() => {
                        addDebugLog('Retrying SSE connection...');
                        connectSSE();
                    }, 10000);
                };

            } catch (err) {
                addDebugLog(`SSE setup error: ${err.message}`);
                setConnectionStatus('error');
            }
        };

        // Start with fetch only, then SSE
        fetchUsage().then(() => {
            // Only try SSE if fetch was successful
            if (!error) {
                connectSSE();
            }
        });

        return () => {
            if (evtSource) {
                addDebugLog('Closing SSE connection');
                evtSource.close();
            }
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, []);

    // Test server connectivity function
    const testConnection = async () => {
        addDebugLog('Testing server connection...');
        try {
            const response = await fetch('https://live-server1.com/health');
            if (response.ok) {
                addDebugLog('Server health check: OK');
                const data = await response.json();
                addDebugLog(`Server response: ${JSON.stringify(data)}`);
            } else {
                addDebugLog(`Server health check failed: ${response.status}`);
            }
        } catch (err) {
            addDebugLog(`Server connection test failed: ${err.message}`);
        }
    };

    const handleRefresh = async () => {
        addDebugLog('Manual refresh triggered');
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch("https://live-server1.com/api/usage", {
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            
            const json = await res.json();
            setData(json);
            setLastUpdated(new Date());
            setError(null);
            addDebugLog('Manual refresh successful');
        } catch (err) {
            addDebugLog(`Manual refresh failed: ${err.message}`);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="p-4 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p>Loading usage data...</p>
                
                {/* Debug Panel */}
                <div className="mt-4 p-4 bg-gray-100 rounded-lg w-full max-w-2xl">
                    <h3 className="font-bold mb-2">Debug Information:</h3>
                    <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                        {debugInfo.map((log, index) => (
                            <div key={index} className="font-mono">{log}</div>
                        ))}
                    </div>
                    <button 
                        onClick={testConnection}
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
                
                {/* Debug Panel */}
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
                        Retry
                    </button>
                    <button 
                        onClick={testConnection}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                        Test Connection
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
            default: return 'text-gray-600';
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return 'Live';
            case 'connecting': return 'Connecting...';
            case 'disconnected': return 'Reconnecting...';
            case 'error': return 'Connection Error';
            default: return 'Unknown';
        }
    };

    return (
        <div className={`p-6 space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {/* Header with Live Update Indicator */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Usage Dashboard</h1>
                <div className="flex items-center gap-4">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
                        <div className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected' ? 'bg-green-500' : 
                            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
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

            {/* Debug Panel (collapsible) */}
            <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Debug Information ({debugInfo.length} logs)
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                    {debugInfo.map((log, index) => (
                        <div key={index} className="font-mono">{log}</div>
                    ))}
                </div>
            </details>

            {/* Rest of your dashboard remains the same */}
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

            {/* Charts and other sections remain the same as your original code */}
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

            {/* Recent sections remain the same */}
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
                    <p className="text-gray-500">No recent uploads</p>
                )}
            </div>
        </div>
    );
}
