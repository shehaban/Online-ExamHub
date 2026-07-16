export function toSqlDateTime(value: string): string | null {
  if (!value) return null
  return value.replace('T', ' ') + ':00'
}

export function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
}
