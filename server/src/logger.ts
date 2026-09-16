/*
 * The one module allowed to touch `console` — ESLint's `no-console` is an error
 * everywhere else, but Railway collects stdout/stderr, so logging has to go
 * somewhere. One JSON object per line keeps the Railway log viewer filterable.
 *
 * NEVER pass document text, the API key or full prompts in here. Log facts
 * *about* them instead: text length, file name, duration, error code, retry flag.
 */

type LogLevel = 'info' | 'warn' | 'error'

export type LogFields = Record<string, string | number | boolean | null | undefined>

function write(level: LogLevel, message: string, fields: LogFields): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
  // eslint-disable-next-line no-console -- single sanctioned console call, see module comment
  console[level](line)
}

export const logger = {
  info: (message: string, fields: LogFields = {}): void => write('info', message, fields),
  warn: (message: string, fields: LogFields = {}): void => write('warn', message, fields),
  error: (message: string, fields: LogFields = {}): void => write('error', message, fields),
}
