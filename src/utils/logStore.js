// logStore.js

const listeners = [];
const logs = [];

// Sensitive keys that should be partially hashed - add variations
const SENSITIVE_KEYS = ['_envId', 'x-api-key', '_apiKey', 'envId', 'apiKey', 'env_id', 'api_key'];

// Simple hash function
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
};

// Function to partially hash sensitive values
const hashSensitiveValue = (value) => {
    if (typeof value !== 'string' || value.length === 0) {
        return value;
    }

    // Show first 3 characters, hash the rest
    if (value.length <= 6) {
        // For short values, show first char and hash the rest
        return value.charAt(0) + '***' + simpleHash(value.slice(1));
    } else {
        // For longer values, show first 3 chars and hash the rest
        return value.substring(0, 3) + '***' + simpleHash(value.slice(3));
    }
};

// Function to check if a string contains sensitive patterns
const processSensitiveStrings = (str) => {
    if (typeof str !== 'string') return str;

    // Look for patterns like: _envId=value, _apiKey:value, etc.
    let processed = str;

    SENSITIVE_KEYS.forEach(key => {
        // Match patterns like: key=value, key:value, key="value", key:'value'
        const patterns = [
            new RegExp(`(${key}\\s*[=:]\\s*["']?)([^"'\\s,}&]+)(["']?)`, 'gi'),
            new RegExp(`("${key}"\\s*:\\s*["']?)([^"'\\s,}&]+)(["']?)`, 'gi')
        ];

        patterns.forEach(pattern => {
            processed = processed.replace(pattern, (match, prefix, value, suffix) => {
                return prefix + hashSensitiveValue(value) + suffix;
            });
        });
    });

    return processed;
};

// Function to recursively process sensitive data in objects
const processSensitiveData = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        // Also process strings for embedded sensitive data
        return typeof obj === 'string' ? processSensitiveStrings(obj) : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(processSensitiveData);
    }

    const processed = {};
    for (const [key, value] of Object.entries(obj)) {
        // Check for exact key matches (case-insensitive)
        const isKeyMatch = SENSITIVE_KEYS.some(sensitiveKey =>
            key.toLowerCase() === sensitiveKey.toLowerCase()
        );

        if (isKeyMatch) {
            processed[key] = hashSensitiveValue(value);
        } else if (typeof value === 'string') {
            // Process strings that might contain sensitive data
            processed[key] = processSensitiveStrings(value);
        } else if (typeof value === 'object') {
            processed[key] = processSensitiveData(value);
        } else {
            processed[key] = value;
        }
    }
    return processed;
};

export const logStore = {
    addLog: (log) => {
        // Add debug logging to see what's being processed
        console.log('Original log:', log);

        // Process sensitive data before storing
        const processedLog = processSensitiveData(log);

        console.log('Processed log:', processedLog);

        logs.push(processedLog);
        // Send logs in reverse order (most recent first)
        listeners.forEach((cb) => cb([...logs].reverse()));
    },

    subscribe: (cb) => {
        listeners.push(cb);
        // Send current logs immediately in reverse order (most recent first)
        cb([...logs].reverse());
        return () => {
            const index = listeners.indexOf(cb);
            if (index !== -1) listeners.splice(index, 1);
        };
    },
};
