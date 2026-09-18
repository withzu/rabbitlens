import type { ReactNode } from "react"

const TOKEN_RE =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

function tokenClass(token: string): string {
  if (token.endsWith(":") || /:\s*$/.test(token)) {
    return "text-violet-600 dark:text-violet-400"
  }
  if (token.startsWith('"')) {
    return "text-emerald-600 dark:text-emerald-400"
  }
  if (token === "true" || token === "false" || token === "null") {
    return "text-sky-600 dark:text-sky-400"
  }
  return "text-amber-600 dark:text-amber-400"
}

export function highlightJson(json: string) {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(json)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(json.slice(lastIndex, match.index))
    }
    nodes.push(
      <span key={key++} className={tokenClass(match[0])}>
        {match[0]}
      </span>
    )
    lastIndex = TOKEN_RE.lastIndex
  }

  if (lastIndex < json.length) {
    nodes.push(json.slice(lastIndex))
  }

  return nodes
}
