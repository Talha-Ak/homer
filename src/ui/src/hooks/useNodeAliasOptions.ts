import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/api'

interface HepsubItem {
  hepid?: string | number
  hep_alias?: string
  profile?: string
}

export interface NodeAliasOption {
  label: string
  value: string
}

interface HepsubsResponse {
  data?: {
    items?: HepsubItem[]
  }
}

let cachedOptions: NodeAliasOption[] | null = null
let fetchPromise: Promise<NodeAliasOption[]> | null = null

function buildOptions(items: HepsubItem[]): NodeAliasOption[] {
  const byHepID = new Map<string, string[]>()

  for (const item of items) {
    const hepID = String(item.hepid ?? '').trim()
    if (!hepID) continue

    const display = String(item.profile ?? item.hep_alias ?? '').trim()
    const labels = byHepID.get(hepID) ?? []
    if (display && !labels.includes(display)) labels.push(display)
    byHepID.set(hepID, labels)
  }

  return [...byHepID.entries()]
    .map(([hepID, labels]) => ({
      value: hepID,
      label: labels.length > 0 ? `${labels.join(', ')} (${hepID})` : hepID,
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        sensitivity: 'base',
        numeric: true,
      }),
    )
}

async function fetchNodeAliasOptions(): Promise<NodeAliasOption[]> {
  const resp = await apiGet<HepsubsResponse>('/hepsubs', { 'page[limit]': 1000 })
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
