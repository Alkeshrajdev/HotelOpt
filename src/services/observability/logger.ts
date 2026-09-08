/**
 * Structured logging — §29.3, §26.
 *
 * Two requirements pull against each other. Observability wants a `trace_id` correlating
 * an API error to its logs; privacy says no client or purchaser data appears in logs or
 * traces at all. Both are satisfiable only if the log record carries IDENTIFIERS and never
 * CONTENT: a support engineer looks the record up, under their own access, rather than
 * reading it out of a log line.
 *
 * The mechanism is an ALLOWLIST of loggable field names, not a denylist of forbidden ones.
 * A denylist protects against the fields someone remembered; the next field added to a
 * payload is logged by default and nobody notices until it appears in an export. An
 * allowlist fails the other way, which is the way that is safe: a new field is dropped
 * until it is deliberately added here.
 *
 * A dropped field is recorded by NAME in `redacted`. Silently swallowing it would leave a
 * debugging engineer wondering why the context they added never appeared.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Field names that may appear in a log record.
 *
 * Every entry is an identifier, an enum, a count or a duration. None of them is text a
 * person wrote or a name a person has.
 */
export const LOGGABLE_FIELDS = [
  'trace_id',
  'tenant_id',
  'hotel_id',
  'portfolio_id',
  'period_id',
  'user_id',
  'credential_id',
  'record_id',
  'record_type',
  'job_id',
  'engagement_id',
  'report_id',
  'route',
  'method',
  'status',
  'problem_type',
  'duration_ms',
  'row_count',
  'attempt',
  'outcome',
  'error_name',
  'error_code',
  'integration',
  'event_type',
] as const

export type LoggableField = (typeof LOGGABLE_FIELDS)[number]

export interface LogRecord {
  readonly level: LogLevel
  readonly event: string
  readonly at: string
  readonly fields: Readonly<Partial<Record<LoggableField, string | number>>>
  /** Names of fields dropped because they are not on the allowlist. Values never appear. */
  readonly redacted: readonly string[]
}

export interface LogSink {
  write(record: LogRecord): void
}

/**
 * A message a caller passed as the event name is not a free-text field: it names a thing
 * that happened. Anything longer than this is prose, and prose is where a hotel name or a
 * guest's email ends up.
 */
const MAX_EVENT_LENGTH = 80

export class UnloggableEvent extends Error {}

const ALLOWED = new Set<string>(LOGGABLE_FIELDS)

export function buildRecord(
  level: LogLevel,
  event: string,
  fields: Readonly<Record<string, unknown>> = {},
  now: () => Date = () => new Date(),
): LogRecord {
  if (event.trim() === '' || event.length > MAX_EVENT_LENGTH) {
    throw new UnloggableEvent(
      `a log event names what happened in at most ${MAX_EVENT_LENGTH} characters; received ${event.length}`,
    )
  }

  const kept: Partial<Record<LoggableField, string | number>> = {}
  const redacted: string[] = []

  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED.has(key)) {
      redacted.push(key)
      continue
    }
    if (typeof value === 'number') {
      kept[key as LoggableField] = value
      continue
    }
    if (typeof value === 'string') {
      kept[key as LoggableField] = value
      continue
    }
    // An object or an array on an allowlisted key is a payload someone attached to an
    // identifier field. The key is allowlisted; this shape is not.
    redacted.push(key)
  }

  return {
    level,
    event,
    at: now().toISOString(),
    fields: kept,
    redacted,
  }
}

export class Logger {
  constructor(
    private readonly sink: LogSink,
    private readonly base: Readonly<Record<string, unknown>> = {},
  ) {}

  /** A child logger carrying the request's trace id and scope on every record. */
  with(fields: Readonly<Record<string, unknown>>): Logger {
    return new Logger(this.sink, { ...this.base, ...fields })
  }

  log(level: LogLevel, event: string, fields: Readonly<Record<string, unknown>> = {}): LogRecord {
    const record = buildRecord(level, event, { ...this.base, ...fields })
    this.sink.write(record)
    return record
  }

  debug = (event: string, fields?: Readonly<Record<string, unknown>>) =>
    this.log('debug', event, fields)
  info = (event: string, fields?: Readonly<Record<string, unknown>>) =>
    this.log('info', event, fields)
  warn = (event: string, fields?: Readonly<Record<string, unknown>>) =>
    this.log('warn', event, fields)
  error = (event: string, fields?: Readonly<Record<string, unknown>>) =>
    this.log('error', event, fields)
}

/**
 * An error, reduced to what may be logged.
 *
 * The message is deliberately NOT included. An error message is the most reliable place
 * for a hotel name, a file path or a row of client data to reach a log, and the trace id
 * is what makes the full error retrievable from the platform's own error store instead.
 */
export function loggableError(error: unknown): { error_name: string; error_code?: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code
    return {
      error_name: error.name,
      ...(typeof code === 'string' ? { error_code: code } : {}),
    }
  }
  return { error_name: 'UnknownError' }
}

export function consoleSink(): LogSink {
  return {
    write(record) {
      process.stdout.write(`${JSON.stringify(record)}\n`)
    },
  }
}
