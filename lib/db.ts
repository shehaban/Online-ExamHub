import sql from 'mssql'

const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  database: process.env.MSSQL_DATABASE,
  server: process.env.MSSQL_SERVER || 'localhost',
  port: parseInt(process.env.MSSQL_PORT || '1433', 10),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true', // Use true for Azure
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true', // Use true for local dev / self-signed certs
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool
  }

  try {
    pool = await sql.connect(sqlConfig)
    console.log('Connected to SQL Server')
    return pool
  } catch (error) {
    console.error('Database connection error:', error)
    throw new Error('Failed to connect to database')
  }
}

export async function query<T>(
  queryString: string,
  params?: Record<string, unknown>
): Promise<sql.IResult<T>> {
  const connection = await getConnection()
  const request = connection.request()

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value)
    }
  }

  return request.query(queryString)
}

export { sql }
