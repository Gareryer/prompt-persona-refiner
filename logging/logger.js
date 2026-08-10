/**
 * ============================================================================
 * LOGGER - Centralized Logging System for Extension Lifecycle
 * ============================================================================
 * 
 * Provides structured logging across all extension contexts (content, background,
 * sidepanel) with ring buffer for bounded memory, log levels, and PII sanitization.
 * 
 * ============================================================================
 * USAGE
 * ============================================================================
 * 
 * // Get logger instance
 * const logger = Logger.getInstance();
 * 
 * // Log with different levels
 * logger.debug('Detailed debug info', { data: 'value' });
 * logger.info('General info');
 * logger.warn('Warning message');
 * logger.error('Error occurred', error);
 * logger.trace('Function entry/exit');
 * 
 * // Log with component context
 * logger.info('Message', { component: 'MemoryController' });
 * 
 * ============================================================================
 */

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4
};

/**
 * Log level colors for console output
 */
const LOG_COLORS = {
    TRACE: '#9e9e9e',
    DEBUG: '#2196f3',
    INFO: '#4caf50',
    WARN: '#ff9800',
    ERROR: '#f44336'
};

/**
 * Logger configuration
 * Set DEV_MODE to false for production to reduce console noise
 */
const LOGGER_CONFIG = {
    DEV_MODE: true,             // Set false for production - disables verbose console output
    maxEntries: 1000,           // Ring buffer size
    persistInterval: 5000,      // Auto-persist every 5s
    defaultLevel: 'DEBUG',      // Default log level
    enableConsole: true,        // Output to console (always on in DEV_MODE)
    enablePersistence: true,    // Save to storage
    maxPayloadSize: 5000        // Max chars per payload
};

/**
 * PII patterns to sanitize
 */
const PII_PATTERNS = [
    { pattern: /AIza[0-9A-Za-z\-_]{35}/g, replacement: '[GOOGLE_API_KEY]' },
    { pattern: /sk-[a-zA-Z0-9]{48}/g, replacement: '[OPENAI_API_KEY]' },
    { pattern: /sk-ant-[a-zA-Z0-9\-]{93}/g, replacement: '[ANTHROPIC_API_KEY]' },
    { pattern: /Bearer\s+[a-zA-Z0-9\-_.]+/gi, replacement: 'Bearer [REDACTED]' },
    { pattern: /api[_-]?key["']?\s*[:=]\s*["']?[a-zA-Z0-9\-_]+["']?/gi, replacement: 'api_key=[REDACTED]' }
];

/**
 * Ring buffer for bounded log storage
 */
class RingBuffer {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.head = 0;
    }

    push(item) {
        if (this.buffer.length < this.maxSize) {
            this.buffer.push(item);
        } else {
            this.buffer[this.head] = item;
            this.head = (this.head + 1) % this.maxSize;
        }
    }

    getAll() {
        if (this.buffer.length < this.maxSize) {
            return [...this.buffer];
        }
        // Return in chronological order
        return [
            ...this.buffer.slice(this.head),
            ...this.buffer.slice(0, this.head)
        ];
    }

    clear() {
        this.buffer = [];
        this.head = 0;
    }

    get length() {
        return this.buffer.length;
    }
}

/**
 * Log entry structure
 */
class LogEntry {
    constructor(level, message, data = {}, component = 'Unknown', tags = [], correlationId = null) {
        this.id = crypto.randomUUID?.() || Date.now().toString(36);
        this.timestamp = Date.now();
        this.level = level;
        this.message = message;
        this.data = data;
        this.component = component;
        this.tags = tags;
        this.correlationId = correlationId;
        this.context = this._detectContext();
    }

    _detectContext() {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
            try {
                if (chrome.runtime.getBackgroundPage) return 'background';
            } catch { }
        }
        if (typeof document !== 'undefined') {
            if (document.location?.href?.includes('sidepanel')) return 'sidepanel';
            if (document.location?.href?.includes('options')) return 'options';
            return 'content';
        }
        return 'unknown';
    }

    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,
            level: this.level,
            message: this.message,
            data: this.data,
            component: this.component,
            tags: this.tags,
            correlationId: this.correlationId,
            context: this.context
        };
    }

    format() {
        const time = new Date(this.timestamp).toISOString().split('T')[1].slice(0, 12);
        return `[${time}] [${this.level}] [${this.component}] ${this.message}`;
    }
}

/**
 * Logger - Singleton logging service
 */
class Logger {
    static _instance = null;

    static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    constructor() {
        if (Logger._instance) {
            return Logger._instance;
        }

        this.buffer = new RingBuffer(LOGGER_CONFIG.maxEntries);
        this.level = LOG_LEVELS[LOGGER_CONFIG.defaultLevel];
        this.listeners = new Set();
        this._persistTimer = null;

        // Performance timers
        this._timers = new Map();

        // Correlation IDs for tracking operations
        this._activeOperations = new Map();

        // Auto-persist if enabled
        if (LOGGER_CONFIG.enablePersistence) {
            this._startAutoPersist();
        }

        // Restore from storage (including level preference)
        this._restore();
        this._restoreLevel();

        Logger._instance = this;
    }

    /**
     * Check if direct storage access is available
     */
    _hasDirectStorage() {
        return typeof chrome !== 'undefined' && !!chrome.storage?.local;
    }

    /**
     * Helper for bridge requests
     */
    _makeBridgeRequest(action, key, data = null, area = 'local') {
        return new Promise((resolve, reject) => {
            const requestId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const handler = (event) => {
                const { requestId: resId, success, data, error } = event.detail || {};
                if (resId === requestId) {
                    window.removeEventListener('pa-storage-response', handler);
                    if (success) {
                        resolve(data);
                    } else {
                        reject(new Error(error || 'Bridge request failed'));
                    }
                }
            };

            window.addEventListener('pa-storage-response', handler);

            window.dispatchEvent(new CustomEvent('pa-storage-request', {
                detail: { action, key, data, requestId, area }
            }));

            setTimeout(() => {
                window.removeEventListener('pa-storage-response', handler);
                reject(new Error('Bridge timeout'));
            }, 3000);
        });
    }

    /**
     * Set minimum log level (persists to storage)
     * @param {string} level - Log level name
     * @param {boolean} persist - Whether to save preference
     */
    async setLevel(level, persist = true) {
        if (LOG_LEVELS[level] !== undefined) {
            this.level = LOG_LEVELS[level];
            this.info(`Log level set to ${level}`, { component: 'Logger' });

            // Persist preference
            // Persist preference
            if (persist) {
                try {
                    if (this._hasDirectStorage()) {
                        await chrome.storage.sync.set({ _logLevel: level });
                    } else {
                        await this._makeBridgeRequest('set', '_logLevel', level, 'sync');
                    }
                } catch (e) {
                    console.error('Failed to persist log level:', e);
                }
            }
        }
    }

    /**
     * Restore log level from storage
     */
    async _restoreLevel() {
        try {
            let result;
            if (this._hasDirectStorage()) {
                result = await chrome.storage.sync.get('_logLevel');
            } else {
                const val = await this._makeBridgeRequest('get', '_logLevel', null, 'sync');
                result = val ? { _logLevel: val } : {};
            }

            if (result._logLevel && LOG_LEVELS[result._logLevel] !== undefined) {
                this.level = LOG_LEVELS[result._logLevel];
                console.log(`[Logger] Restored log level: ${result._logLevel}`);
            }
        } catch (e) {
            console.error('Failed to restore log level:', e);
        }
    }

    /**
     * Add log listener (for UI updates)
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Core logging method
     */
    _log(level, message, data = {}) {
        if (LOG_LEVELS[level] < this.level) return;

        // Extract component, tags, and correlationId from data
        const component = data.component || 'App';
        const tags = data.tags || [];
        const correlationId = data.correlationId || null;
        delete data.component;
        delete data.tags;
        delete data.correlationId;

        // Sanitize PII
        const sanitizedMessage = this._sanitize(message);
        const sanitizedData = this._sanitizeObject(data);

        // Create entry with all fields
        const entry = new LogEntry(level, sanitizedMessage, sanitizedData, component, tags, correlationId);
        this.buffer.push(entry);

        // Console output
        if (LOGGER_CONFIG.enableConsole) {
            this._consoleOutput(entry);
        }

        // Notify listeners
        this._notifyListeners(entry);

        return entry;
    }

    /**
     * Log level methods
     */
    trace(message, data = {}) {
        return this._log('TRACE', message, data);
    }

    debug(message, data = {}) {
        return this._log('DEBUG', message, data);
    }

    info(message, data = {}) {
        return this._log('INFO', message, data);
    }

    warn(message, data = {}) {
        return this._log('WARN', message, data);
    }

    error(message, data = {}) {
        // Handle Error objects
        if (data instanceof Error) {
            data = {
                error: data.message,
                stack: data.stack,
                errorType: data.errorType
            };
        }
        return this._log('ERROR', message, data);
    }

    // ========================================================================
    // Performance Timers (Enhancement 1)
    // ========================================================================

    /**
     * Start a performance timer
     * @param {string} label - Timer label
     */
    time(label) {
        this._timers.set(label, performance.now());
        this.trace(`Timer started: ${label}`, { component: 'Logger', timer: label });
    }

    /**
     * End a performance timer and log duration
     * @param {string} label - Timer label
     * @returns {number|null} Duration in ms
     */
    timeEnd(label) {
        const start = this._timers.get(label);
        if (!start) {
            this.warn(`Timer not found: ${label}`, { component: 'Logger' });
            return null;
        }

        const duration = Math.round((performance.now() - start) * 100) / 100;
        this._timers.delete(label);

        this.debug(`Timer ${label}: ${duration}ms`, {
            component: 'Logger',
            timer: label,
            duration
        });

        return duration;
    }

    // ========================================================================
    // Correlation IDs (Enhancement 2)
    // ========================================================================

    /**
     * Start a tracked operation with correlation ID
     * @param {string} name - Operation name
     * @returns {string} Correlation ID
     */
    startOperation(name) {
        const correlationId = crypto.randomUUID?.() || `op-${Date.now()}`;
        this._activeOperations.set(correlationId, {
            name,
            startTime: performance.now(),
            startedAt: Date.now()
        });

        this.info(`Operation started: ${name}`, {
            component: 'Logger',
            correlationId,
            operation: name
        });

        return correlationId;
    }

    /**
     * End a tracked operation
     * @param {string} correlationId - Correlation ID from startOperation
     * @param {string} result - 'success' | 'failure' | 'cancelled'
     */
    endOperation(correlationId, result = 'success') {
        const op = this._activeOperations.get(correlationId);
        if (!op) {
            this.warn(`Operation not found: ${correlationId}`, { component: 'Logger' });
            return;
        }

        const duration = Math.round((performance.now() - op.startTime) * 100) / 100;
        this._activeOperations.delete(correlationId);

        const level = result === 'failure' ? 'error' : 'info';
        this[level](`Operation ended: ${op.name} (${result})`, {
            component: 'Logger',
            correlationId,
            operation: op.name,
            result,
            duration
        });
    }

    // ========================================================================
    // Structured Action Logging (Enhancement 4)
    // ========================================================================

    /**
     * Log a structured action
     * @param {string} actionType - e.g., 'api_call', 'user_click', 'storage_write'
     * @param {string} target - Target of the action
     * @param {'success'|'failure'|'pending'} result - Outcome
     * @param {Object} data - Additional data
     */
    action(actionType, target, result, data = {}) {
        const level = result === 'failure' ? 'error' : result === 'pending' ? 'debug' : 'info';
        return this._log(level, `[${actionType}] ${target}: ${result}`, {
            action: actionType,
            target,
            result,
            ...data
        });
    }

    // ========================================================================
    // Analyzer & Schema Logging (Unified Analyzer Support)
    // ========================================================================

    /**
     * Log analyzer component result
     * @param {string} componentId - e.g., 'topic_summarizer', 'intent_classifier'
     * @param {'start'|'success'|'failure'|'skipped'} status - Analysis status
     * @param {Object} data - Additional data (duration, errors, etc.)
     */
    analyzer(componentId, status, data = {}) {
        const statusPrefix = {
            start: '[->]',
            success: '[OK]',
            failure: '[ERR]',
            skipped: '[SKIP]'
        }[status] || '[~]';

        const level = status === 'failure' ? 'error' : status === 'skipped' ? 'debug' : 'info';
        return this._log(level, `${statusPrefix} [Analyzer] ${componentId}: ${status}`, {
            component: 'UnifiedAnalyzer',
            analyzerId: componentId,
            status,
            ...data
        });
    }

    /**
     * Log schema validation result
     * @param {string} componentId - Component being validated
     * @param {boolean} valid - Whether validation passed
     * @param {string[]} errors - Validation errors if any
     */
    schema(componentId, valid, errors = []) {
        const level = valid ? 'debug' : 'warn';
        const status = valid ? 'valid' : 'invalid';
        return this._log(level, `[Schema] ${componentId}: ${status}`, {
            component: 'ComponentSchemas',
            analyzerId: componentId,
            valid,
            errors: errors.length > 0 ? errors : undefined,
            errorCount: errors.length
        });
    }

    /**
     * Log LLM API call with schema enforcement status
     * @param {string} provider - LLM provider (gemini, openai, anthropic, openrouter)
     * @param {'start'|'success'|'failure'} status - Call status
     * @param {Object} data - Additional data (duration, schemaEnforced, tokens, etc.)
     */
    llmCall(provider, status, data = {}) {
        const statusPrefix = status === 'success' ? '[OK]' : status === 'failure' ? '[ERR]' : '[->]';
        const level = status === 'failure' ? 'error' : 'info';

        const schemaStatus = data.schemaEnforced ? '(schema-enforced)' : '(no schema)';
        return this._log(level, `${statusPrefix} [LLM] ${provider} ${status} ${schemaStatus}`, {
            component: 'LLMClient',
            provider,
            status,
            schemaEnforced: data.schemaEnforced || false,
            ...data
        });
    }

    // ========================================================================
    // Comprehensive Activity Logging (Macro-Level Tracking)
    // ========================================================================

    /**
     * Log user click/interaction event
     * @param {string} target - Element or button clicked
     * @param {string} component - Component where click occurred
     * @param {Object} data - Additional context (value, state, etc.)
     */
    click(target, component, data = {}) {
        return this._log('DEBUG', `[Click] ${component} -> ${target}`, {
            component,
            eventType: 'click',
            target,
            ...data
        });
    }

    /**
     * Log storage operation (read/write/delete)
     * @param {'read'|'write'|'delete'|'clear'} operation - Storage operation type
     * @param {string} key - Storage key
     * @param {Object} data - Additional context (size, success, etc.)
     */
    storage(operation, key, data = {}) {
        const opPrefix = {
            read: '[R]',
            write: '[W]',
            delete: '[D]',
            clear: '[C]'
        }[operation] || '[~]';

        return this._log('DEBUG', `${opPrefix} [Storage] ${operation}: ${key}`, {
            component: 'Storage',
            operation,
            key,
            ...data
        });
    }

    /**
     * Log bridge/messaging event
     * @param {'send'|'receive'|'relay'} direction - Message direction
     * @param {string} messageType - Message type/action
     * @param {Object} data - Additional context (source, target, etc.)
     */
    bridge(direction, messageType, data = {}) {
        const dirPrefix = {
            send: '[OUT]',
            receive: '[IN]',
            relay: '[REL]'
        }[direction] || '[~]';

        return this._log('DEBUG', `${dirPrefix} [Bridge] ${direction}: ${messageType}`, {
            component: 'Bridge',
            direction,
            messageType,
            ...data
        });
    }

    /**
     * Log lifecycle event (init, destroy, load, unload)
     * @param {string} component - Component name
     * @param {'init'|'ready'|'load'|'unload'|'destroy'|'error'} event - Lifecycle event
    lifecycle(component, event, data = {}) {
        const evPrefix = {
            init: '[INIT]',
            ready: '[RDY]',
            load: '[LOAD]',
            unload: '[UNLD]',
            destroy: '[DSTROY]',
            error: '[ERR]'
        }[event] || '[~]';

        const level = event === 'error' ? 'error' : 'info';
        return this._log(level, `${evPrefix} [Lifecycle] ${component}: ${event}`, {
            component,
            lifecycle: event,
            ...data
        });
    }

    /**
     * Log state change
     * @param {string} component - Component name
     * @param {string} stateName - State variable name
     * @param {*} oldValue - Previous value
     * @param {*} newValue - New value
     */
    state(component, stateName, oldValue, newValue) {
        return this._log('DEBUG', `[State] ${component}.${stateName} changed`, {
            component,
            stateName,
            oldValue: typeof oldValue === 'object' ? JSON.stringify(oldValue).slice(0, 100) : oldValue,
            newValue: typeof newValue === 'object' ? JSON.stringify(newValue).slice(0, 100) : newValue
        });
    }

    /**
     * Log DOM mutation/injection
     * @param {'inject'|'remove'|'update'|'observe'} operation - DOM operation
     * @param {string} target - Target element/selector
     * @param {Object} data - Additional context
     */
    dom(operation, target, data = {}) {
        const emoji = {
            inject: '[INJ]',
            remove: '[DEL]',
            update: '[UPD]',
            observe: '[OBS]'
        }[operation] || '[~]';

        return this._log('DEBUG', `${emoji} [DOM] ${operation}: ${target}`, {
            component: 'DOM',
            operation,
            target,
            ...data
        });
    }

    /**
     * Log external API call (non-LLM)
     * @param {string} endpoint - API endpoint or service name
     * @param {'start'|'success'|'failure'} status - Call status
     * @param {Object} data - Additional context (method, statusCode, etc.)
     */
    api(endpoint, status, data = {}) {
        const statusPrefix = status === 'success' ? '[OK]' : status === 'failure' ? '[ERR]' : '[NET]';
        const level = status === 'failure' ? 'error' : 'debug';

        return this._log(level, `${emoji} [API] ${endpoint}: ${status}`, {
            component: 'API',
            endpoint,
            status,
            ...data
        });
    }

    /**
     * Sanitize string for PII
     */
    _sanitize(str) {
        if (typeof str !== 'string') return str;

        let sanitized = str;
        for (const { pattern, replacement } of PII_PATTERNS) {
            sanitized = sanitized.replace(pattern, replacement);
        }
        return sanitized;
    }

    /**
     * Recursively sanitize object
     */
    _sanitizeObject(obj) {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return this._sanitize(obj);
        if (typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.map(item => this._sanitizeObject(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip sensitive keys entirely
            if (/apikey|api_key|secret|password|token|auth/i.test(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                sanitized[key] = this._sanitize(value);
            } else if (typeof value === 'object') {
                sanitized[key] = this._sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * Console output with styling
     */
    _consoleOutput(entry) {
        const color = LOG_COLORS[entry.level] || '#000';
        const prefix = entry.format();

        const styles = `color: ${color}; font-weight: ${entry.level === 'ERROR' ? 'bold' : 'normal'}`;

        if (Object.keys(entry.data).length > 0) {
            console.groupCollapsed(`%c${prefix}`, styles);
            console.log('Data:', entry.data);
            console.groupEnd();
        } else {
            console.log(`%c${prefix}`, styles);
        }
    }

    /**
     * Notify all listeners
     */
    _notifyListeners(entry) {
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (e) {
                console.error('Logger listener error:', e);
            }
        }
    }

    /**
     * Get all logs
     */
    getLogs(options = {}) {
        let logs = this.buffer.getAll();

        // Filter by level
        if (options.level) {
            const minLevel = LOG_LEVELS[options.level];
            logs = logs.filter(log => LOG_LEVELS[log.level] >= minLevel);
        }

        // Filter by component
        if (options.component) {
            logs = logs.filter(log => log.component === options.component);
        }

        // Filter by context
        if (options.context) {
            logs = logs.filter(log => log.context === options.context);
        }

        // Filter by tag (Enhancement 3)
        if (options.tag) {
            logs = logs.filter(log => log.tags && log.tags.includes(options.tag));
        }

        // Filter by correlationId (Enhancement 2)
        if (options.correlationId) {
            logs = logs.filter(log => log.correlationId === options.correlationId);
        }

        // Limit results
        if (options.limit) {
            logs = logs.slice(-options.limit);
        }

        return logs;
    }

    /**
     * Export logs as JSON string
     */
    export() {
        const logs = this.buffer.getAll();
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            count: logs.length,
            logs: logs.map(l => l.toJSON())
        }, null, 2);
    }

    /**
     * Download logs as file (Enhancement 6)
     * @param {string} filename - File name for download
     */
    downloadExport(filename = 'prompt-assistant-logs.json') {
        const data = this.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.info(`Logs exported: ${filename}`, { component: 'Logger' });
    }

    /**
     * Get log statistics
     * @returns {Object} Stats about logged entries
     */
    getStats() {
        const logs = this.buffer.getAll();
        const byLevel = {};
        const byComponent = {};

        for (const log of logs) {
            byLevel[log.level] = (byLevel[log.level] || 0) + 1;
            byComponent[log.component] = (byComponent[log.component] || 0) + 1;
        }

        return {
            total: logs.length,
            byLevel,
            byComponent,
            oldestTimestamp: logs[0]?.timestamp,
            newestTimestamp: logs[logs.length - 1]?.timestamp
        };
    }

    /**
     * Clear all logs
     */
    clear() {
        this.buffer.clear();
        this.info('Logs cleared', { component: 'Logger' });
    }

    /**
     * Persist to storage
     */
    async _persist() {
        if (!LOGGER_CONFIG.enablePersistence) return;

        // Check if extension context is still valid
        if (!chrome.runtime?.id) return;

        try {
            const logs = this.buffer.getAll().map(l => l.toJSON());
            if (this._hasDirectStorage()) {
                await chrome.storage.session.set({ _logs: logs });
            } else {
                await this._makeBridgeRequest('set', '_logs', logs, 'session');
            }
        } catch (e) {
            // Silently ignore context invalidation errors
            if (!e.message?.includes('Extension context invalidated') &&
                !e.message?.includes('not allowed from this context')) {
                console.error('Logger persist failed:', e);
            }
        }
    }

    /**
     * Restore from storage
     */
    async _restore() {
        // Check if extension context is still valid (prevents errors after reload)
        if (!chrome.runtime?.id) return;

        try {
            let result;
            if (this._hasDirectStorage()) {
                result = await chrome.storage.session.get('_logs');
            } else {
                const val = await this._makeBridgeRequest('get', '_logs', null, 'session');
                result = val ? { _logs: val } : {};
            }

            if (result._logs && Array.isArray(result._logs)) {
                for (const logData of result._logs) {
                    const entry = Object.assign(new LogEntry('INFO', ''), logData);
                    this.buffer.push(entry);
                }
                console.log(`[Logger] Restored ${result._logs.length} logs from session`);
            }
        } catch (e) {
            // Silently ignore context invalidation errors (expected after extension reload)
            if (!e.message?.includes('Extension context invalidated') &&
                !e.message?.includes('not allowed from this context')) {
                console.error('Logger restore failed:', e);
            }
        }
    }

    /**
     * Start auto-persist timer
     */
    _startAutoPersist() {
        if (this._persistTimer) return;
        this._persistTimer = setInterval(() => this._persist(), LOGGER_CONFIG.persistInterval);
    }

    /**
     * Stop auto-persist
     */
    destroy() {
        if (this._persistTimer) {
            clearInterval(this._persistTimer);
            this._persistTimer = null;
        }
        this._persist(); // Final persist
    }
}

// ============================================================================
// Exports
// ============================================================================

// Make available globally
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    window.LOG_LEVELS = LOG_LEVELS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, LogEntry, RingBuffer, LOG_LEVELS, LOGGER_CONFIG };
}
