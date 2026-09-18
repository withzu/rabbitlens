export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function tryPrettyJson(payload: string): {
  formatted: string
  isJson: boolean
} {
  try {
    const parsed = JSON.parse(payload)
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { formatted: payload, isJson: false }
  }
}

export function formatTimestamp(timestamp?: number): string | null {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toLocaleString()
}

export function formatDeliveryMode(mode?: number): string | undefined {
  if (mode === 2) return "Persistent (2)"
  if (mode === 1) return "Transient (1)"
  return undefined
}
