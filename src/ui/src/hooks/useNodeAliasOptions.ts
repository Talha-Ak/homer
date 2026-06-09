import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/api'

interface AliasItem {
  alias?: string
  capture_id?: string | number
  status?: boolean
}

export interface NodeAliasOption {
  label: string
  value: string
}

interface AliasesResponse {
  data?: {
    items?: AliasItem[]
  }
}

let cachedOptions: NodeAliasOption[] | null = null
let fetchPromise: Promise<NodeAliasOption[]> | null = null

function buildOptions(items: AliasItem[]): NodeAliasOption[] {
  const byCaptureId = new Map<string, string[]>()

  for (const item of items) {
    if (item.status === false) continue

    const captureId = String(item.capture_id ?? '').trim()
    if (!captureId) continue

    const alias = String(item.alias ?? '').trim()
    const names = byCaptureId.get(captureId) ?? []
    if (alias && !names.includes(alias)) names.push(alias)
    byCaptureId.set(captureId, names)
  }

  return [...byCaptureId.entries()]
    .map(([captureId, aliases]) => ({
      value: captureId,
      label: aliases.length > 0 ? `${aliases.join(', ')} (${captureId})` : captureId,
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    )
}

async function fetchNodeAliasOptions(): Promise<NodeAliasOption[]> {
  const resp = await apiGet<AliasesResponse>('/aliases', { 'page[limit]': 1000 })
  return buildOptions(resp?.data?.items ?? [])
}

export function useNodeAliasOptions() {
  const [options, setOptions] = useState<NodeAliasOption[]>(cachedOptions ?? [])
  const [loading, setLoading] = useState(!cachedOptions)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    if (cachedOptions && !force) {
      setOptions(cachedOptions)
      setLoading(false)
      return
    }

    if (!fetchPromise || force) fetchPromise = fetchNodeAliasOptions()

    setLoading(true)
    setError(null)
    try {
      const result = await fetchPromise
      cachedOptions = result
      setOptions(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setOptions([])
    } finally {
      setLoading(false)
      fetchPromise = null
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(() => {
    cachedOptions = null
    fetchPromise = null
    void load(true)
  }, [load])

  return { options, loading, error, refresh }
}
