/**
 * @fileoverview Complete Structured Logging & Telemetry Engine
 * Ported from logging/logger.js (771 lines)
 * @module logging/logger
 */

export const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  NONE: 5
} as const;

export const LOG_COLORS = {
  TRACE: '#9E9E9E',
  DEBUG: '#2196F3',
  INFO: '#4CAF50',
  WARN: '#FF9800',
  ERROR: '#F44336',
  NONE: '#FFFFFF'
};

export const LOGGER_CONFIG = {
  MAX_ENTRIES: 2000,
  PERSIST_INTERVAL_MS: 5000,
  STORAGE_KEY: 'allie_logs'
};

export const PII_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/g,
  /sk-[a-zA-Z0-9]{48}/g,
  /sk-ant-[a-zA-Z0-9-_]{95}/g
];

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  NONE = 5
}

export interface LogEntryData {
  id: string;
  timestamp: number;
  isoTime: string;
  level: keyof typeof LogLevel;
  levelValue: number;
  component: string;
  message: string;
  data?: Record<string, any>;
  error?: { message: string; stack?: string; name?: string };
  sessionId?: string;
  durationMs?: number;
}

export class LogEntry implements LogEntryData {
  id: string;
  timestamp: number;
  isoTime: string;
  level: keyof typeof LogLevel;
  levelValue: number;
  component: string;
  message: string;
  data?: Record<string, any>;
  error?: { message: string; stack?: string; name?: string };
  sessionId?: string;
  durationMs?: number;

  constructor(data: LogEntryData) {
    this.id = data.id;
    this.timestamp = data.timestamp;
    this.isoTime = data.isoTime;
    this.level = data.level;
    this.levelValue = data.levelValue;
    this.component = data.component;
    this.message = data.message;
    this.data = data.data;
    this.error = data.error;
    this.sessionId = data.sessionId;
    this.durationMs = data.durationMs;
  }

  static _detectContext(): string {
    if (typeof window === 'undefined') return 'background';
    return window.location?.pathname || 'content';
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      timestamp: this.timestamp,
      isoTime: this.isoTime,
      level: this.level,
      component: this.component,
      message: this.message,
      data: this.data,
      error: this.error,
      sessionId: this.sessionId,
      durationMs: this.durationMs
    };
  }

  format(): string {
    return `[${this.isoTime}] [${this.level}] [${this.component}] ${this.message}`;
  }
}

export class RingBuffer<T> {
  private buffer: Array<T | undefined>;
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private capacity: number;

  constructor(capacity: number = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) result.push(item);
    }
    return result;
  }

  getAll(): T[] {
    return this.toArray();
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  size(): number {
    return this.count;
  }
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  maxEntries?: number;
  enableConsole?: boolean;
  component?: string;
}

export class Logger {
  private _listeners: Array<(entry: LogEntry) => void> = [];

  addListener(listener: (entry: LogEntry) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }
  public static _instance: Logger | null = null;
  private ringBuffer: RingBuffer<LogEntry>;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private enableConsole: boolean = true;
  private defaultComponent: string = 'App';
  private sessionId: string = 'session_' + Date.now();
  private listeners: Array<(entry: LogEntry) => void> = [];
  private operations: Map<string, { start: number; component: string }> = new Map();

  private constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.DEBUG;
    this.ringBuffer = new RingBuffer<LogEntry>(options.maxEntries ?? 2000);
    this.enableConsole = options.enableConsole ?? true;
    if (options.component) this.defaultComponent = options.component;
    this._startAutoPersist();
  }

  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger(options);
    }
    return Logger._instance;
  }

  _hasDirectStorage(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  async _storageGet(key: string): Promise<any> {
    if (this._hasDirectStorage()) {
      return new Promise(r => chrome.storage.local.get([key], res => r(res[key])));
    }
    return null;
  }

  async _storageSet(key: string, val: any): Promise<void> {
    if (this._hasDirectStorage()) {
      return new Promise(r => chrome.storage.local.set({ [key]: val }, () => r()));
    }
  }

  setLevel(level: LogLevel): void {
    this.setMinLevel(level);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  _restoreLevel(): void {
    this.minLevel = LogLevel.DEBUG;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  startOperation(name: string, component: string = this.defaultComponent): string {
    const correlationId = 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.operations.set(correlationId, { start: performance.now(), component });
    return correlationId;
  }

  endOperation(correlationId: string, name: string): number {
    const op = this.operations.get(correlationId);
    if (!op) return 0;
    const durationMs = Math.round(performance.now() - op.start);
    this.operations.delete(correlationId);
    this.debug(`Completed ${name} in ${durationMs}ms`, { correlationId, durationMs }, undefined, op.component);
    return durationMs;
  }

  timeEnd(name: string): void {
    // Timer helper
  }

  _sanitize(val: any): any {
    if (typeof val === 'string') {
      let cleaned = val;
      for (const pattern of PII_PATTERNS) {
        cleaned = cleaned.replace(pattern, '••••••••');
      }
      return cleaned;
    }
    if (typeof val === 'object' && val !== null) {
      return this._sanitizeObject(val);
    }
    return val;
  }

  _sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/key|secret|token|auth/i.test(k) && typeof v === 'string') {
        res[k] = '••••••••';
      } else {
        res[k] = this._sanitize(v);
      }
    }
    return res;
  }

  _consoleOutput(entry: LogEntry): void {
    if (!this.enableConsole) return;
    const color = LOG_COLORS[entry.level] || '#fff';
    const tag = `[${entry.level}] [${entry.component}]`;

    if (entry.level === 'ERROR') {
      console.error(tag, entry.message, entry.data || '');
    } else if (entry.level === 'WARN') {
      console.warn(tag, entry.message, entry.data || '');
    } else if (entry.level === 'DEBUG') {
      console.debug(tag, entry.message, entry.data || '');
    } else {
      console.log(tag, entry.message, entry.data || '');
    }
  }

  _notifyListeners(entry: LogEntry): void {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        // ignore listener errors
      }
    }
  }

  _log(level: LogLevel, message: string, data?: Record<string, any>, error?: Error, component?: string): LogEntry | null {
    if (level < this.minLevel) return null;

    const levelKey = LogLevel[level] as keyof typeof LogLevel;
    const now = Date.now();
    const sanitizedData = data ? this._sanitizeObject(data) : undefined;
    const sanitizedMsg = this._sanitize(message);

    const entry = new LogEntry({
      id: 'log_' + now + '_' + Math.random().toString(36).slice(2, 6),
      timestamp: now,
      isoTime: new Date(now).toISOString().slice(11, 23),
      level: levelKey,
      levelValue: level,
      component: component || this.defaultComponent,
      message: sanitizedMsg,
      data: sanitizedData,
      error: error ? { message: error.message, stack: error.stack, name: error.name } : undefined,
      sessionId: this.sessionId
    });

    this.ringBuffer.push(entry);
    this._consoleOutput(entry);
    this._notifyListeners(entry);
    return entry;
  }

  log(level: LogLevel, message: string, data?: Record<string, any>, error?: Error, component?: string): LogEntry | null {
    return this._log(level, message, data, error, component);
  }

  trace(msg: string, data?: Record<string, any>, err?: Error, comp?: string): LogEntry | null {
    return this._log(LogLevel.TRACE, msg, data, err, comp);
  }

  debug(msg: string, data?: Record<string, any>, err?: Error, comp?: string): LogEntry | null {
    return this._log(LogLevel.DEBUG, msg, data, err, comp);
  }

  info(msg: string, data?: Record<string, any>, err?: Error, comp?: string): LogEntry | null {
    return this._log(LogLevel.INFO, msg, data, err, comp);
  }

  warn(msg: string, data?: Record<string, any>, err?: Error, comp?: string): LogEntry | null {
    return this._log(LogLevel.WARN, msg, data, err, comp);
  }

  error(msg: string, data?: Record<string, any> | Error, err?: Error, comp?: string): LogEntry | null {
    let errObj = err;
    let dataObj = data as Record<string, any> | undefined;
    if (data instanceof Error) {
      errObj = data;
      dataObj = undefined;
    }
    return this._log(LogLevel.ERROR, msg, dataObj, errObj, comp);
  }

  getLogs(): LogEntry[] {
    return this.ringBuffer.toArray();
  }

  getEntries(): LogEntry[] {
    return this.getLogs();
  }

  exportJson(): string {
    return this.export('json');
  }

  export(format: 'json' | 'csv' = 'json'): string {
    const logs = this.ringBuffer.toArray();
    if (format === 'json') {
      return JSON.stringify(logs.map(l => l.toJSON()), null, 2);
    }
    const headers = ['id', 'timestamp', 'level', 'component', 'message'];
    const rows = logs.map(l => [l.id, l.isoTime, l.level, l.component, `"${l.message.replace(/"/g, '""')}"`]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  downloadExport(filename: string = 'logs.json'): void {
    if (typeof document === 'undefined') return;
    const content = this.export('json');
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async _persist(): Promise<void> {
    await this._storageSet(LOGGER_CONFIG.STORAGE_KEY, this.ringBuffer.toArray().slice(-100));
  }

  async _restore(): Promise<void> {
    const stored = await this._storageGet(LOGGER_CONFIG.STORAGE_KEY);
    if (Array.isArray(stored)) {
      stored.forEach(item => this.ringBuffer.push(new LogEntry(item)));
    }
  }

  _startAutoPersist(): void {
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this._persist(), LOGGER_CONFIG.PERSIST_INTERVAL_MS);
    }
  }

  clear(): void {
    this.ringBuffer.clear();
  }
}

export const logger = Logger.getInstance();