export const userRoles = {
  ADMIN: 'ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  STUDENT: 'STUDENT',
}

/**
 * Normalizes legacy role values to the current unified set.
 * 'TEACHER', 'instructor', 'Instructor' etc. all become 'INSTRUCTOR'.
 */
export function normalizeRole(role) {
  if (!role) return 'STUDENT'
  const upper = role.toUpperCase()
  if (upper === 'TEACHER' || upper === 'INSTRUCTOR') return 'INSTRUCTOR'
  if (upper === 'ADMIN') return 'ADMIN'
  return 'STUDENT'
}
