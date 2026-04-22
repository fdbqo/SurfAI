import type {
  DisableDeviceBody,
  GetDeviceProfileResponse,
  RegisterDeviceBody,
  RegisterDeviceResponse,
  TransferCreateBody,
  TransferCreateResponse,
  TransferRedeemBody,
  TransferRedeemResponse,
  VapidPublicKeyResponse,
} from './types'

export type EngineClientOptions = {
  baseUrl: string
  /** Optional; use when engine verifies JWT and ignores client userId. */
  getAuthHeaders?: () => Record<string, string> | undefined | Promise<Record<string, string> | undefined>
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export function createEngineClient(options: EngineClientOptions) {
  const { baseUrl, getAuthHeaders } = options

  async function authHeaders(): Promise<Record<string, string> | undefined> {
    if (!getAuthHeaders) return undefined
    return await getAuthHeaders()
  }

  async function parseJson<T>(res: Response): Promise<T> {
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
    if (!res.ok) {
      const looksLikeHtml =
        contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)
      if (looksLikeHtml) {
        throw new Error(
          `Surf Engine ${res.status}: got HTML (wrong baseUrl?). Set NEXT_PUBLIC_ENGINE_URL (Next) or EXPO_PUBLIC_ENGINE_URL (Expo).`
        )
      }
      throw new Error(`Surf Engine ${res.status}: ${text.slice(0, 200)}`)
    }
    if (!text) return {} as T
    return JSON.parse(text) as T
  }

  return {
    async getVapidPublicKey(): Promise<string> {
      const headers: HeadersInit = { Accept: 'application/json', ...(await authHeaders()) }
      const res = await fetch(joinUrl(baseUrl, '/api/push/vapid-public-key'), { method: 'GET', headers })
      const data = await parseJson<VapidPublicKeyResponse>(res)
      if (!data.publicKey) throw new Error('Surf Engine: missing publicKey in VAPID response')
      return data.publicKey
    },

    async registerDevice(body: RegisterDeviceBody): Promise<RegisterDeviceResponse> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch(joinUrl(baseUrl, '/api/v1/devices/register'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await parseJson<RegisterDeviceResponse | unknown>(res)
      if (typeof data === 'object' && data && 'ok' in data) {
        return data as RegisterDeviceResponse
      }
      // Backwards compatibility: older deploys may return empty body.
      return { ok: true }
    },

    async disableDevice(body: DisableDeviceBody): Promise<void> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch(joinUrl(baseUrl, '/api/v1/devices/disable'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      await parseJson<unknown>(res)
    },

    async createTransferCode(body: TransferCreateBody): Promise<TransferCreateResponse> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch(joinUrl(baseUrl, '/api/v1/transfer/create'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      return await parseJson<TransferCreateResponse>(res)
    },

    async redeemTransferCode(body: TransferRedeemBody): Promise<TransferRedeemResponse> {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeaders()),
      }
      const res = await fetch(joinUrl(baseUrl, '/api/v1/transfer/redeem'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      return await parseJson<TransferRedeemResponse>(res)
    },

    async getDeviceProfile(deviceId: string): Promise<GetDeviceProfileResponse> {
      const q = new URLSearchParams({ deviceId })
      const res = await fetch(joinUrl(baseUrl, `/api/v1/profile?${q}`), {
        method: 'GET',
        headers: { Accept: 'application/json', ...(await authHeaders()) },
      })
      return await parseJson<GetDeviceProfileResponse>(res)
    },
  }
}

export type EngineClient = ReturnType<typeof createEngineClient>
