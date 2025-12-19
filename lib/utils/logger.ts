/**
 * Centralized logging utility
 * Provides environment-aware logging with consistent formatting
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug'

interface LogContext {
  component?: string
  action?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * General log - only in development
   */
  log(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.format('LOG', message, context))
    }
  }

  /**
   * Info log - only in development
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.format('INFO', message, context))
    }
  }

  /**
   * Warning log - only in development
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(this.format('WARN', message, context))
    }
  }

  /**
   * Debug log - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.format('DEBUG', message, context))
    }
  }

  /**
   * Error log - always logs (production + development)
   * Errors should always be captured for monitoring
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorMessage = this.format('ERROR', message, context)

    if (error instanceof Error) {
      console.error(errorMessage, {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        ...context?.metadata,
      })
    } else if (error) {
      console.error(errorMessage, { error, ...context?.metadata })
    } else {
      console.error(errorMessage, context?.metadata)
    }
  }

  /**
   * Format log message with context
   */
  private format(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const parts = [`[${timestamp}]`, `[${level}]`]

    if (context?.component) {
      parts.push(`[${context.component}]`)
    }

    if (context?.action) {
      parts.push(`[${context.action}]`)
    }

    parts.push(message)

    return parts.join(' ')
  }
}

// Export singleton instance
export const logger = new Logger()
