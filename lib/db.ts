import sql from 'mssql'

const config: sql.config = {
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  server: process.env.MSSQL_SERVER || '',
  database: process.env.MSSQL_DATABASE || '',
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true', // Set to true for local dev
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool
  }

  try {
    pool = await sql.connect(config)
    console.log('Connected to MSSQL database')
    return pool
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

export async function query<T>(
  queryString: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  const connection = await getConnection()
  const request = connection.request()

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })
  }

  const result = await request.query(queryString)
  return result.recordset as T[]
}

export { sql }
