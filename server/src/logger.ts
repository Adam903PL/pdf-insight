/*
 * Railway collects stdout. One JSON object per line keeps its log viewer
 * filterable without exceptions to the project's no-console rule.
 *
 * NEVER pass document text, the API key or full prompts in here. Log facts
 * *about* them instead: text length, file name, duration, error code, retry flag.
 */

type LogLevel = 'info' | 'warn' | 'error'

export type LogFields = Record<string, string | number | boolean | null | undefined>

function write(level: LogLevel, message: string, fields: LogFields): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
  process.stdout.write(`${line}\n`)
}

export const logger = {
  info: (message: string, fields: LogFields = {}): void => write('info', message, fields),
  warn: (message: string, fields: LogFields = {}): void => write('warn', message, fields),
  error: (message: string, fields: LogFields = {}): void => write('error', message, fields),
}
