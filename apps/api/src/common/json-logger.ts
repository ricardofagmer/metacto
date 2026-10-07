import { LoggerService } from '@nestjs/common';
import { currentCorrelationId } from './request-context';

export const SERVICE_NAME = 'fis-api';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFields = Record<string, unknown>;

function isLogFields(value: unknown): value is LogFields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Structured JSON lines on stdout; callers pass ids and counts only, never names or free text from users.
export class JsonLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  event(level: LogLevel, event: string, fields: LogFields = {}): void {
    this.emit({ level, event, ...fields });
  }

  private write(level: LogLevel, message: unknown, optionalParams: unknown[]): void {
    const fields: LogFields = {};
    // Nest passes the logging context (class name) as the last string parameter.
    const lastParam = optionalParams.at(-1);
    if (typeof lastParam === 'string') {
      fields.context = lastParam;
    }
    optionalParams.filter(isLogFields).forEach((extra) => Object.assign(fields, extra));
    if (isLogFields(message)) {
      this.emit({ level, event: 'log', ...message, ...fields });
      return;
    }
    this.emit({ level, event: 'log', message: String(message), ...fields });
  }

  private emit(entry: LogFields): void {
    const line = {
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
      correlationId: currentCorrelationId(),
      ...entry,
    };
    process.stdout.write(`${JSON.stringify(line)}\n`);
  }
}

export const appLogger = new JsonLogger();
