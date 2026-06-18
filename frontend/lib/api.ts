const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('exam_platform_token') || ''
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  let data
  const text = await response.text()

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`)
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`)
  }

  return data
}
export async function apiUpload(endpoint: string, formData: FormData) {
  const token = getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const contentType = response.headers.get('content-type')

  if (!contentType?.includes('application/json')) {
    const text = await response.text()
    throw new Error(`Expected JSON but got: ${text.slice(0, 200)}`)
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Upload failed')
  }

  return data
}
