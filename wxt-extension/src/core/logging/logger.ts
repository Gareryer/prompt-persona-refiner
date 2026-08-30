/**
 * @fileoverview Complete Structured Logging & Telemetry Engine
 * 
 * Provides bounded circular buffer, multi-level log sinks, session correlation,
 * and JSON/CSV export capabilities.
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  NONE = 5
}

export interface LogEntry {
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

export interface LoggerOptions {
  minLevel?: LogLevel;
  maxEntries?: number;
  enableConsole?: boolean;
  component?: string;
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

export class Logger {
  private static instance: Logger;
  private ringBuffer: RingBuffer<LogEntry>;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private enableConsole: boolean = true;
  private defaultComponent: string = 'App';
  private sessionId: string = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  private listeners: Array<(entry: LogEntry) => void> = [];

  private constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.DEBUG;
    this.ringBuffer = new RingBuffer<LogEntry>(options.maxEntries ?? 2000);
    this.enableConsole = options.enableConsole ?? true;
    if (options.component) this.defaultComponent = options.component;
  }

  static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: Error,
    component?: string
  ): LogEntry | null {
    if (level < this.minLevel) return null;

    const levelKey = LogLevel[level] as keyof typeof LogLevel;
    const now = Date.now();
    const entry: LogEntry = {
      id: `log_${now}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      level: levelKey,
      levelValue: level,
      component: component || this.defaultComponent,
      message,
      data,
      sessionId: this.sessionId
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.ringBuffer.push(entry);
    this.notifyListeners(entry);

    if (this.enableConsole) {
      this.writeToConsole(entry);
    }

    return entry;
  }

  trace(msg: string, data?: Record<string, any>, comp?: string): LogEntry | null {
    return this.log(LogLevel.TRACE, msg, data, undefined, comp);
  }

  debug(msg: string, data?: Record<string, any>, comp?: string): LogEntry | null {
    return this.log(LogLevel.DEBUG, msg, data, undefined, comp);
  }

  info(msg: string, data?: Record<string, any>, comp?: string): LogEntry | null {
    return this.log(LogLevel.INFO, msg, data, undefined, comp);
  }

  warn(msg: string, data?: Record<string, any>, error?: Error, comp?: string): LogEntry | null {
    return this.log(LogLevel.WARN, msg, data, error, comp);
  }

  error(msg: string, error?: Error | any, data?: Record<string, any>, comp?: string): LogEntry | null {
    const errObj = error instanceof Error ? error : (error ? new Error(String(error)) : undefined);
    return this.log(LogLevel.ERROR, msg, data, errObj, comp);
  }

  time(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`Timer: ${label}`, { durationMs: Math.round(duration * 100) / 100 });
      return duration;
    };
  }

  getEntries(filter?: { level?: LogLevel; component?: string; search?: string }): LogEntry[] {
    let entries = this.ringBuffer.toArray();
    if (!filter) return entries;

    if (filter.level !== undefined) {
      entries = entries.filter(e => e.levelValue >= filter.level!);
    }
    if (filter.component) {
      entries = entries.filter(e => e.component.toLowerCase() === filter.component!.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      entries = entries.filter(e => e.message.toLowerCase().includes(q) || JSON.stringify(e.data || '').toLowerCase().includes(q));
    }
    return entries;
  }

  clear(): void {
    this.ringBuffer.clear();
  }

  exportJson(): string {
    return JSON.stringify(this.ringBuffer.toArray(), null, 2);
  }

  exportCsv(): string {
    const entries = this.ringBuffer.toArray();
    if (entries.length === 0) return 'Timestamp,Level,Component,Message,Data\n';

    const header = 'Timestamp,ISO_Time,Level,Component,Message,SessionId\n';
    const rows = entries.map(e => {
      const msg = (e.message || '').replace(/"/g, '""');
      return `${e.timestamp},"${e.isoTime}",${e.level},${e.component},"${msg}",${e.sessionId || ''}`;
    });
    return header + rows.join('\n');
  }

  private notifyListeners(entry: LogEntry): void {
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[Logger] Listener error:', err);
      }
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.isoTime.slice(11, 23)}] [${entry.level}] [${entry.component}]`;
    const args: any[] = [prefix, entry.message];
    if (entry.data && Object.keys(entry.data).length > 0) args.push(entry.data);
    if (entry.error) args.push(entry.error);

    switch (entry.levelValue) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        break;
    }
  }
}

export const logger = Logger.getInstance();
