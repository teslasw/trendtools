import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  sessionId?: string;
}

class Logger {
  private currentDate: string;
  private logFilePath: string;

  constructor() {
    this.currentDate = this.getDateString();
    this.logFilePath = this.getLogFilePath();
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  private getLogFilePath(): string {
    return path.join(LOG_DIR, `${this.currentDate}.log`);
  }

  private rotateIfNeeded(): void {
    const currentDate = this.getDateString();
    if (currentDate !== this.currentDate) {
      this.currentDate = currentDate;
      this.logFilePath = this.getLogFilePath();
    }

    // Check file size and rotate if needed
    if (fs.existsSync(this.logFilePath)) {
      const stats = fs.statSync(this.logFilePath);
      if (stats.size > MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rotatedPath = path.join(
          LOG_DIR,
          `${this.currentDate}-${timestamp}.log`
        );
        fs.renameSync(this.logFilePath, rotatedPath);
      }
    }
  }

  private writeLog(entry: LogEntry): void {
    this.rotateIfNeeded();

    const logLine = JSON.stringify(entry) + "\n";

    // Write to file
    fs.appendFileSync(this.logFilePath, logLine);

    // Also log to console for dev
    const consolePrefix = `[${entry.level.toUpperCase()}] [${entry.category}]`;
    const sessionPrefix = entry.sessionId ? ` [${entry.sessionId}]` : "";

    if (entry.level === "error") {
      console.error(`${consolePrefix}${sessionPrefix} ${entry.message}`, entry.data || "");
    } else if (entry.level === "warn") {
      console.warn(`${consolePrefix}${sessionPrefix} ${entry.message}`, entry.data || "");
    } else {
      console.log(`${consolePrefix}${sessionPrefix} ${entry.message}`, entry.data || "");
    }
  }

  log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    sessionId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      sessionId,
    };

    this.writeLog(entry);
  }

  info(category: string, message: string, data?: any, sessionId?: string): void {
    this.log("info", category, message, data, sessionId);
  }

  warn(category: string, message: string, data?: any, sessionId?: string): void {
    this.log("warn", category, message, data, sessionId);
  }

  error(category: string, message: string, data?: any, sessionId?: string): void {
    this.log("error", category, message, data, sessionId);
  }

  debug(category: string, message: string, data?: any, sessionId?: string): void {
    this.log("debug", category, message, data, sessionId);
  }
}

// Singleton instance
export const logger = new Logger();

// Helper to get recent logs
export function getRecentLogs(lines: number = 100): string[] {
  const logDir = LOG_DIR;
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith(".log"))
    .sort()
    .reverse();

  if (files.length === 0) {
    return [];
  }

  const latestFile = path.join(logDir, files[0]);
  const content = fs.readFileSync(latestFile, "utf-8");
  const allLines = content.split("\n").filter(Boolean);

  return allLines.slice(-lines);
}
