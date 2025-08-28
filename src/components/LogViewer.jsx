// LogViewer.js
import React, { useEffect, useState } from 'react';
import { logStore } from '../utils/logStore';

export default function LogViewer() {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const unsubscribe = logStore.subscribe(setLogs);
        return () => unsubscribe();
    }, []);

    // Helper function to format log data
    const formatLogData = (data) => {
        if (typeof data === 'object' && data !== null) {
            return JSON.stringify(data, null, 2);
        }
        return String(data);
    };

    // Helper function to render log message with proper formatting
    const renderLogMessage = (log) => {
        if (typeof log.message === 'object') {
            return (
                <pre className="whitespace-pre-wrap break-words">
                    {formatLogData(log.message)}
                </pre>
            );
        }
        return log.message;
    };

    return (
        <div className="p-4 h-full bg-gray-900 text-green-300 font-mono text-sm h-64 overflow-y-auto rounded shadow">
            {logs.map((log, index) => (
                <div key={index} className="mb-2 border-b border-gray-700 pb-2">
                    <div className="text-gray-400">
                        [{log.timestamp}] [{log.level}] [{log.tag}]
                    </div>
                    <div className="mt-1 pl-4">
                        {renderLogMessage(log)}
                    </div>
                </div>
            ))}
        </div>
    );
}
