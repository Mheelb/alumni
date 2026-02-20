import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { buildApp } from './helpers/app'
import { startDb, stopDb, clearDb } from './setup'

let app: Awaited<ReturnType<typeof buildApp>>

const validAlumni = {
  firstName: 'Marie',
  lastName: 'Curie',
  email: 'marie.curie@example.com',
  isActive: true,
}

// Timeout étendu pour le téléchargement de MongoDB au premier run
beforeAll(async () => {
  await startDb()
  app = await buildApp()
}, 60000)

afterEach(async () => {
  await clearDb()
})

afterAll(async () => {
  await app.close()
  await stopDb()
})

// ─── Health ─────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('retourne 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
  })

  it('retourne status ok et db connected', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.db).toBe('connected')
  })
})

// ─── GET /alumni ─────────────────────────────────────────────────────────────

describe('GET /alumni', () => {
  it('retourne une liste vide au départ', async () => {
    const res = await app.inject({ method: 'GET', url: '/alumni' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.total).toBe(0)
    expect(res.json().data.alumni).toEqual([])
  })

  it('retourne les alumni après création', async () => {
    await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const res = await app.inject({ method: 'GET', url: '/alumni' })
    expect(res.json().data.total).toBe(1)
    expect(res.json().data.alumni[0].email).toBe(validAlumni.email)
  })
})

// ─── POST /alumni ─────────────────────────────────────────────────────────────

describe('POST /alumni', () => {
  it('crée un alumni avec des données valides', async () => {
    const res = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    expect(res.statusCode).toBe(201)
    expect(res.json().status).toBe('success')
    expect(res.json().data.email).toBe(validAlumni.email)
  })

  it('assigne le statut "unlinked" par défaut', async () => {
    const res = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    expect(res.json().data.status).toBe('unlinked')
  })

  it('retourne 409 si l\'email existe déjà', async () => {
    await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const res = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toContain('déjà')
  })

  it('retourne 400 avec un email invalide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alumni',
      payload: { firstName: 'Jean', lastName: 'Bon', email: 'pas-un-email', isActive: true },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retourne 400 si le prénom est trop court', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alumni',
      payload: { ...validAlumni, firstName: 'A', email: 'autre@example.com' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ─── PUT /alumni/:id ─────────────────────────────────────────────────────────

describe('PUT /alumni/:id', () => {
  it('met à jour les champs d\'un alumni existant', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PUT',
      url: `/alumni/${id}`,
      payload: { city: 'Paris', company: 'CNRS' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.city).toBe('Paris')
    expect(res.json().data.company).toBe('CNRS')
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/alumni/000000000000000000000000',
      payload: { city: 'Lyon' },
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── PATCH /alumni/:id/deactivate ────────────────────────────────────────────

describe('PATCH /alumni/:id/deactivate', () => {
  it('désactive un alumni (isActive → false)', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id

    const res = await app.inject({ method: 'PATCH', url: `/alumni/${id}/deactivate` })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.isActive).toBe(false)
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/alumni/000000000000000000000000/deactivate',
    })
    expect(res.statusCode).toBe(404)
  })
})

// ─── DELETE /alumni/:id ──────────────────────────────────────────────────────

describe('DELETE /alumni/:id', () => {
  it('supprime un alumni existant', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id

    const res = await app.inject({ method: 'DELETE', url: `/alumni/${id}` })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('success')
  })

  it('l\'alumni n\'est plus listable après suppression', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id
    await app.inject({ method: 'DELETE', url: `/alumni/${id}` })

    const list = await app.inject({ method: 'GET', url: '/alumni' })
    expect(list.json().data.total).toBe(0)
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/alumni/000000000000000000000000',
    })
    expect(res.statusCode).toBe(404)
  })
})
