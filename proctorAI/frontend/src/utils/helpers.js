export function scoreColor(s) {
  if (s >= 80) return '#1d9e75'
  if (s >= 60) return '#ba7517'
  return '#e24b4a'
}

export function typeColors(type) {
  const map = {
    danger: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', dot: 'var(--danger-dot)' },
    warning: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', dot: 'var(--warning-dot)' },
    info: { bg: 'var(--info-bg)', text: 'var(--info-text)', dot: 'var(--info-dot)' },
    ok: { bg: 'transparent', text: 'var(--ok-dot)', dot: 'var(--ok-dot)' },
  }
  return map[type] || map.ok
}

export function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function riskLabel(score) {
  if (score >= 80) return 'Low risk'
  if (score >= 60) return 'Moderate risk — monitor closely'
  return 'High risk — immediate review required'
}
