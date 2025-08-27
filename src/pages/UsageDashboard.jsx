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
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // New state for connection status

    const { user } = useAuth();
    const { theme } = useContext(ThemeContext);

    useEffect(() => {
        let evtSource;
        let fetchRetryCount = 0;
        const maxRetries = 3;

        async function fetchUsage() {
            try {
                setError(null); // Clear previous errors
                console.log('Fetching usage data...');
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const res = await fetch("https://live-server1.com/api/usage", {
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Accept': 'application/json',
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                const text = await res.text();
                let json;
                try {
                    json = JSON.parse(text);
                } catch (parseError) {
                    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
                }
                
                setData(json);
                setLastUpdated(new Date());
                setError(null);
                fetchRetryCount = 0; // Reset retry count on success
                console.log('Usage data fetched successfully');
                
            } catch (err) {
                console.error("Usage fetch error:", err);
                
                if (err.name === 'AbortError') {
                    setError('Request timeout - server may be slow');
                } else if (err.message.includes('Failed to fetch')) {
                    setError('Network error - check your connection');
                } else {
                    setError(err.message);
                }
                
                // Retry logic for initial fetch
                if (fetchRetryCount < maxRetries && loading) {
                    fetchRetryCount++;
                    console.log(`Retrying fetch (${fetchRetryCount}/${maxRetries}) in 2 seconds...`);
                    setTimeout(() => fetchUsage(), 2000);
                    return;
                }
            } finally {
                setLoading(false);
            }
        }

        const connectSSE = () => {
            try {
                console.log('Connecting to SSE...');
                setConnectionStatus('connecting');
                
                evtSource = new EventSource('https://live-server1.com/events');

                evtSource.onopen = () => {
                    console.log('SSE connected successfully');
                    setConnectionStatus('connected');
                };

                // Show live indicator and hide after 3 seconds
                const showLiveIndicator = () => {
                    setIsLiveUpdate(true);
                    setTimeout(() => setIsLiveUpdate(false), 3000);
                };

                evtSource.addEventListener('upload', e => {
                    try {
                        const eventData = JSON.parse(e.data);
                        showLiveIndicator();
                        
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
                        console.error('Error processing upload event:', err);
                    }
                });

                evtSource.addEventListener('query', e => {
                    try {
                        const eventData = JSON.parse(e.data);
                        showLiveIndicator();
                        
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
                        console.error('Error processing query event:', err);
                    }
                });

                evtSource.addEventListener('database_change', e => {
                    try {
                        showLiveIndicator();
                        fetchUsage(); // Refetch all data
                    } catch (err) {
                        console.error('Error processing database_change event:', err);
                    }
                });

                evtSource.addEventListener('heartbeat', e => {
                    // Just log heartbeat, don't show live indicator
                    console.log('SSE heartbeat received');
                });

                evtSource.onerror = (err) => {
                    console.error('SSE error:', err);
                    setConnectionStatus('disconnected');
                    
                    if (evtSource) {
                        evtSource.close();
                    }
                    
                    // Reconnect after 5 seconds
                    setTimeout(() => {
                        console.log('Attempting to reconnect SSE...');
                        connectSSE();
                    }, 5000);
                };

            } catch (err) {
                console.error('Error setting up SSE:', err);
                setConnectionStatus('error');
                
                // Retry SSE connection after 10 seconds
                setTimeout(() => {
                    console.log('Retrying SSE connection...');
                    connectSSE();
                }, 10000);
            }
        };

        // Start both fetch and SSE
        fetchUsage();
        connectSSE();

        return () => {
            if (evtSource) {
                console.log('Closing SSE connection');
                evtSource.close();
            }
        };
    }, []);

    // Manual refresh function
    const handleRefresh = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch("https://live-server1.com/api/usage", {
                headers: {
                    'Cache-Control': 'no-cache',
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
        } catch (err) {
            console.error("Manual refresh error:", err);
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
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500 mb-4">Error: {error}</p>
                <button 
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Retry
                </button>
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

    // Connection status indicator
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

            {/* Error Banner */}
            {error && data && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                    <p className="font-bold">Warning</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Rest of your existing JSX remains the same */}
            {/* Metrics */}
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

            {/* Recent Uploads */}
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

            {/* Recent Queries */}
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
                    <p className="text-gray-500">No recent queries</p>
                )}
            </div>

            {/* Recent IPs */}
            <div className="flex flex-col gap-4">
                <p className="text-lg font-semibold mb-2">Recent IPs / User Agents</p>
                {recentIPs && recentIPs.length > 0 ? recentIPs.map(ip => (
                    <div key={ip.createdAt} className={cardStyle}>
                        <div className="font-mono text-sm">{ip.ipAddress}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 truncate">{ip.userAgent}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(ip.createdAt).toLocaleString()}</div>
                    </div>
                )) : (
                    <p className="text-gray-500">No recent IP data</p>
                )}
            </div>
        </div>
    );
}
