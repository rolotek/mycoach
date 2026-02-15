/**
 * Playwright Console Logger Utility
 *
 * This utility provides a reusable way to capture and log console messages
 * from web pages, particularly useful for debugging web applications
 * and identifying issues during test execution.
 */

import type { Page } from '@playwright/test'

interface ConsoleLoggerOptions {
  /** Whether to enable console logging (default: true) */
  enabled?: boolean
  /** Array of console message types to capture (default: ['log', 'error', 'warn', 'info', 'debug']) */
  filterTypes?: string[]
  /** Whether to include timestamp in logs (default: false) */
  includeTimestamp?: boolean
  /** Custom prefix for log messages (default: '') */
  prefix?: string
}

/**
 * Sets up console logging for a Playwright page
 * @param page - The Playwright page object
 * @param options - Configuration options
 */
export function setupConsoleLogger(
  page: Page,
  options: ConsoleLoggerOptions = {}
) {
  const {
    enabled = true,
    filterTypes = ['log', 'error', 'warn', 'info', 'debug'],
    includeTimestamp = false,
    prefix = '',
  } = options

  if (!enabled) {
    return
  }

  page.on('console', async (msg) => {
    // Filter by message type if specified
    if (filterTypes.length > 0 && !filterTypes.includes(msg.type())) {
      return
    }

    try {
      const values = await Promise.all(
        msg.args().map((arg) => arg.jsonValue())
      )

      // Format the log message
      let logMessage = ''

      if (prefix) {
        logMessage += `[${prefix}] `
      }

      if (includeTimestamp) {
        const timestamp = new Date().toISOString()
        logMessage += `[${timestamp}] `
      }

      logMessage += `[${msg.type().toUpperCase()}]`

      // Log the message
      console.log(logMessage, ...values)
    } catch (error) {
      // Fallback for cases where jsonValue() fails
      console.log(`[${prefix}][${msg.type().toUpperCase()}]`, msg.text())
    }
  })
}

/**
 * Sets up console logging for general web application debugging
 * @param page - The Playwright page object
 * @param options - Configuration options
 */
export function setupWebAppConsoleLogger(
  page: Page,
  options: ConsoleLoggerOptions = {}
) {
  const defaultOptions: ConsoleLoggerOptions = {
    enabled: true,
    filterTypes: ['log', 'error', 'warn', 'info', 'debug'],
    includeTimestamp: false,
    prefix: 'WEBAPP',
  }

  setupConsoleLogger(page, { ...defaultOptions, ...options })
}

/**
 * Sets up console logging with error-only filtering
 * @param page - The Playwright page object
 * @param options - Configuration options
 */
export function setupErrorOnlyLogger(
  page: Page,
  options: ConsoleLoggerOptions = {}
) {
  const defaultOptions: ConsoleLoggerOptions = {
    enabled: true,
    filterTypes: ['error'],
    includeTimestamp: true,
    prefix: 'ERROR',
  }

  setupConsoleLogger(page, { ...defaultOptions, ...options })
}
