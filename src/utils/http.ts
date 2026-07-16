import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { attachApiInteraction } from './reporting'
import { logApiCall, maskSensitive } from './logging'

export interface RequestOptions {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  payload?: unknown
  headers?: Record<string, string>
  // Query params are serialised to a query string. `undefined` / `null` values
  // are dropped (otherwise `URLSearchParams` would emit literal "undefined").
  params?: Record<string, string | number | boolean | undefined | null>
  label?: string
}

export interface RequestResult<T> {
  res: APIResponse
  json: T
  responseMs: number
}

export async function sendRequest<T>(
  request: APIRequestContext,
  baseUrl: string,
  options: RequestOptions,
  testInfo?: TestInfo,
): Promise<RequestResult<T>> {
  const { path, method, payload, headers, params, label } = options
  let url = `${baseUrl}/${path}`.replace(/([^:])\/\//g, '$1/')
  if (params) {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)] as [string, string])
    if (entries.length > 0) {
      url += `?${new URLSearchParams(entries)}`
    }
  }

  // Strip Content-Type on bodyless verbs — some real APIs / WAFs reject
  // GET/DELETE that carry a Content-Type header. The mock doesn't enforce
  // this, so this is template-correctness, not mock-correctness.
  const sendHeaders =
    payload === undefined && headers
      ? Object.fromEntries(
          Object.entries(headers).filter(([k]) => k.toLowerCase() !== 'content-type'),
        )
      : headers

  const start = Date.now()
  const res = await request.fetch(url, {
    method,
    headers: sendHeaders,
    data: payload !== undefined ? JSON.stringify(payload) : undefined,
  })
  const responseMs = Date.now() - start

  // Only parse JSON for responses that carry a body
  const contentType = res.headers()['content-type'] ?? ''
  const hasBody = res.status() !== 204 && res.status() !== 304
  const json = (
    hasBody && contentType.includes('application/json') ? await res.json().catch(() => null) : null
  ) as T

  const safeHeaders = maskSensitive(headers ?? {}) as Record<string, string>
  const safeBody = maskSensitive(payload)
  const name = label ?? `${method} /${path}`

  if (testInfo) {
    await attachApiInteraction(testInfo, name, {
      request: { method, url, headers: safeHeaders, body: safeBody },
      response: { status: res.status(), responseMs, body: json },
    })
  }
  logApiCall(
    name,
    method,
    url,
    responseMs,
    res.status(),
    safeHeaders,
    payload,
    json,
    testInfo?.title,
  )
  return { res, json, responseMs }
}
