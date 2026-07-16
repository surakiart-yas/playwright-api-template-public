import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { randomUUID } from 'crypto'

// ── Users ────────────────────────────────────────────────────────────────────

type Role = 'admin' | 'user' | 'viewer'

interface MockUser {
  id: string
  email: string
  name: string
  password: string
  role: Role
  createdAt: string
  updatedAt: string
}

const users = new Map<string, MockUser>()

const publicUser = (u: MockUser): Omit<MockUser, 'password'> => {
  const { password: _password, ...rest } = u
  return rest
}

// ── Products ─────────────────────────────────────────────────────────────────

type ProductStatus = 'draft' | 'published' | 'archived'

interface MockProduct {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

const products = new Map<string, MockProduct>()

// Valid status transitions: from → allowed targets
const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['published'],
  published: ['draft', 'archived'],
  archived: [],
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const isoNow = (): string => new Date().toISOString()
const emailValid = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const idShape = /^[A-Za-z0-9_-]+$/

const ok = <T>(data: T, message = 'OK'): { data: T; message: string; success: true } => ({
  data,
  message,
  success: true,
})
const err = (message: string): { data: null; message: string; success: false } => ({
  data: null,
  message,
  success: false,
})

// ── Seed data ─────────────────────────────────────────────────────────────────

function seed(): void {
  const userId = randomUUID()
  users.set(userId, {
    id: userId,
    email: 'admin@example.com',
    name: 'Seed Admin',
    password: 'Admin@123456',
    role: 'admin',
    createdAt: isoNow(),
    updatedAt: isoNow(),
  })

  const p1 = randomUUID()
  products.set(p1, {
    id: p1,
    name: 'Seed Laptop',
    sku: 'LAPTOP-001',
    price: 999.99,
    stock: 50,
    status: 'published',
    createdAt: isoNow(),
    updatedAt: isoNow(),
  })

  const p2 = randomUUID()
  products.set(p2, {
    id: p2,
    name: 'Seed Mouse',
    sku: 'MOUSE-001',
    price: 29.99,
    stock: 200,
    status: 'draft',
    createdAt: isoNow(),
    updatedAt: isoNow(),
  })
}
seed()

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono()

// Tokens issued by /api/auth/login — kept in-memory so subsequent requests
// can be validated. Real APIs check signatures; for the mock we just check
// membership (closer to real behaviour than the previous "any Bearer" check,
// which let invalid tokens through and prevented testing 401 paths properly).
const issuedTokens = new Set<string>()

app.use('*', async (c, next) => {
  const p = c.req.path
  const isPublic = p === '/api/health' || p === '/api/auth/login'
  if (isPublic) {
    await next()
    return
  }
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json(err('Unauthorized'), 401)
  }
  const token = auth.slice('Bearer '.length).trim()
  if (!issuedTokens.has(token)) {
    return c.json(err('Unauthorized — invalid or expired token'), 401)
  }
  await next()
})

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/auth/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    username?: string
    password?: string
  } | null
  if (!body?.username || !body?.password) {
    return c.json(err('username and password are required'), 400)
  }
  const token = `mock-jwt-${randomUUID()}`
  issuedTokens.add(token)
  return c.json(ok({ token }))
})

// ── Users endpoints ───────────────────────────────────────────────────────────

app.get('/api/users', (c) => {
  const pageRaw = c.req.query('page')
  const pageSizeRaw = c.req.query('pageSize')

  const page = pageRaw === undefined ? 1 : Number(pageRaw)
  const pageSize = pageSizeRaw === undefined ? 10 : Number(pageSizeRaw)

  if (!Number.isInteger(page) || page < 1) {
    return c.json(err('Invalid page — must be a positive integer'), 400)
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return c.json(err('Invalid pageSize — must be 1..100'), 400)
  }

  const search = c.req.query('search')?.toLowerCase() ?? ''
  let list = Array.from(users.values()).map(publicUser)
  if (search) {
    list = list.filter(
      (u) => u.email.toLowerCase().includes(search) || u.name.toLowerCase().includes(search),
    )
  }
  const total = list.length
  const start = (page - 1) * pageSize
  return c.json(ok({ items: list.slice(start, start + pageSize), total, page, pageSize }))
})

app.get('/api/users/:id', (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const u = users.get(id)
  if (!u) return c.json(err('User not found'), 404)
  return c.json(ok(publicUser(u)))
})

app.post('/api/users', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    email?: string
    name?: string
    password?: string
    role?: Role
  } | null
  if (!body?.email) return c.json(err('email is required'), 400)
  if (!emailValid(body.email)) return c.json(err('invalid email format'), 400)
  if (!body.name) return c.json(err('name is required'), 400)
  if (!body.password) return c.json(err('password is required'), 400)
  for (const u of users.values()) {
    if (u.email === body.email) return c.json(err('email already exists'), 409)
  }
  const now = isoNow()
  const user: MockUser = {
    id: randomUUID(),
    email: body.email,
    name: body.name,
    password: body.password,
    role: body.role ?? 'user',
    createdAt: now,
    updatedAt: now,
  }
  users.set(user.id, user)
  return c.json(ok(publicUser(user)), 201)
})

app.patch('/api/users/:id', async (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const u = users.get(id)
  if (!u) return c.json(err('User not found'), 404)
  const body = (await c.req.json().catch(() => null)) as { name?: string; role?: Role } | null
  if (body == null) return c.json(err('invalid body'), 400)
  if (body.name !== undefined && body.name.length === 0) {
    return c.json(err('name cannot be empty'), 400)
  }
  if (body.name !== undefined) u.name = body.name
  if (body.role !== undefined) u.role = body.role
  u.updatedAt = isoNow()
  return c.json(ok(publicUser(u)))
})

app.delete('/api/users/:id', (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  if (!users.has(id)) return c.json(err('User not found'), 404)
  users.delete(id)
  return c.body(null, 204)
})

// ── Products endpoints ────────────────────────────────────────────────────────

app.get('/api/products', (c) => {
  const pageRaw = c.req.query('page')
  const pageSizeRaw = c.req.query('pageSize')
  const statusRaw = c.req.query('status')

  const page = pageRaw === undefined ? 1 : Number(pageRaw)
  const pageSize = pageSizeRaw === undefined ? 10 : Number(pageSizeRaw)

  if (!Number.isInteger(page) || page < 1) {
    return c.json(err('Invalid page — must be a positive integer'), 400)
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return c.json(err('Invalid pageSize — must be 1..100'), 400)
  }
  if (statusRaw !== undefined && !['draft', 'published', 'archived'].includes(statusRaw)) {
    return c.json(err(`Invalid status filter — must be one of draft, published, archived`), 400)
  }

  const search = c.req.query('search')?.toLowerCase() ?? ''
  const statusFilter = statusRaw as ProductStatus | undefined
  let list = Array.from(products.values())
  if (search) {
    list = list.filter(
      (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search),
    )
  }
  if (statusFilter) {
    list = list.filter((p) => p.status === statusFilter)
  }
  const total = list.length
  const start = (page - 1) * pageSize
  return c.json(ok({ items: list.slice(start, start + pageSize), total, page, pageSize }))
})

app.get('/api/products/:id', (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const p = products.get(id)
  if (!p) return c.json(err('Product not found'), 404)
  return c.json(ok(p))
})

app.post('/api/products', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: string
    sku?: string
    price?: number
    stock?: number
  } | null
  if (!body?.name) return c.json(err('name is required'), 400)
  if (!body.sku) return c.json(err('sku is required'), 400)
  if (body.price === undefined || body.price === null) return c.json(err('price is required'), 400)
  if (typeof body.price !== 'number' || body.price <= 0) {
    return c.json(err('price must be a positive number'), 400)
  }
  for (const p of products.values()) {
    if (p.sku === body.sku) return c.json(err('sku already exists'), 409)
  }
  const now = isoNow()
  const product: MockProduct = {
    id: randomUUID(),
    name: body.name,
    sku: body.sku,
    price: body.price,
    stock: body.stock ?? 0,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  products.set(product.id, product)
  return c.json(ok(product), 201)
})

app.patch('/api/products/:id', async (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const p = products.get(id)
  if (!p) return c.json(err('Product not found'), 404)
  const body = (await c.req.json().catch(() => null)) as {
    name?: string
    price?: number
    stock?: number
  } | null
  if (body == null) return c.json(err('invalid body'), 400)
  if (body.name !== undefined && body.name.length === 0) {
    return c.json(err('name cannot be empty'), 400)
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || body.price <= 0)) {
    return c.json(err('price must be a positive number'), 400)
  }
  if (body.name !== undefined) p.name = body.name
  if (body.price !== undefined) p.price = body.price
  if (body.stock !== undefined) p.stock = body.stock
  p.updatedAt = isoNow()
  return c.json(ok(p))
})

app.patch('/api/products/:id/status', async (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const p = products.get(id)
  if (!p) return c.json(err('Product not found'), 404)
  const body = (await c.req.json().catch(() => null)) as { status?: string } | null
  if (!body?.status) return c.json(err('status is required'), 400)
  const target = body.status as ProductStatus
  const allowed = STATUS_TRANSITIONS[p.status]
  if (!allowed.includes(target)) {
    return c.json(err(`Cannot transition from '${p.status}' to '${target}'`), 422)
  }
  p.status = target
  p.updatedAt = isoNow()
  return c.json(ok(p))
})

app.delete('/api/products/:id', (c) => {
  const id = c.req.param('id')
  if (!idShape.test(id)) return c.json(err('Malformed id'), 400)
  const p = products.get(id)
  if (!p) return c.json(err('Product not found'), 404)
  if (p.status !== 'draft') {
    return c.json(err(`Only draft products can be deleted (current status: ${p.status})`), 422)
  }
  products.delete(id)
  return c.body(null, 204)
})

// ── Start ─────────────────────────────────────────────────────────────────────

const port = Number(process.env.MOCK_PORT ?? 4010)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[mock] listening on http://localhost:${info.port}`)
})
