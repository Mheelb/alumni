import { describe, it, expect } from 'bun:test'
import { AlumniProfileSchema, AlumniUpdateSchema, LoginSchema, SignUpSchema } from '../index'

const currentYear = new Date().getFullYear()

describe('AlumniProfileSchema', () => {
  const valid = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean@example.com',
    isActive: true,
  }

  it('accepte des données valides minimales', () => {
    expect(AlumniProfileSchema.safeParse(valid).success).toBe(true)
  })

  it('accepte toutes les données optionnelles renseignées', () => {
    const full = {
      ...valid,
      graduationYear: 2020,
      diploma: 'Master',
      city: 'Paris',
      company: 'Acme',
      jobTitle: 'Développeur',
      phone: '0600000000',
      linkedinUrl: 'https://linkedin.com/in/jean',
      avatarUrl: 'https://example.com/photo.jpg',
    }
    expect(AlumniProfileSchema.safeParse(full).success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })

  it('rejette un prénom trop court (< 2 chars)', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, firstName: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejette un nom trop court (< 2 chars)', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, lastName: 'B' })
    expect(result.success).toBe(false)
  })

  it('accepte une linkedinUrl vide (chaîne vide)', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, linkedinUrl: '' })
    expect(result.success).toBe(true)
  })

  it('rejette une linkedinUrl invalide non vide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, linkedinUrl: 'pas-une-url' })
    expect(result.success).toBe(false)
  })

  it('accepte une linkedinUrl null', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, linkedinUrl: null })
    expect(result.success).toBe(true)
  })

  it(`rejette une année de diplomation dans le futur (> ${currentYear})`, () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: currentYear + 1 })
    expect(result.success).toBe(false)
  })

  it('rejette une année antérieure à 1900', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: 1899 })
    expect(result.success).toBe(false)
  })

  it('accepte graduationYear null', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: null })
    expect(result.success).toBe(true)
  })

  it('accepte une année de diplomation valide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: 2020 })
    expect(result.success).toBe(true)
  })
})

describe('AlumniUpdateSchema', () => {
  it('accepte des données partielles (city seul)', () => {
    expect(AlumniUpdateSchema.safeParse({ city: 'Paris' }).success).toBe(true)
  })

  it('accepte un objet vide (tout optionnel)', () => {
    expect(AlumniUpdateSchema.safeParse({}).success).toBe(true)
  })

  it('ignore le champ email (omit)', () => {
    const result = AlumniUpdateSchema.safeParse({ email: 'new@example.com' })
    expect((result.data as Record<string, unknown>)?.email).toBeUndefined()
  })

  it('accepte une mise à jour partielle valide', () => {
    const result = AlumniUpdateSchema.safeParse({ company: 'Google', jobTitle: 'Engineer' })
    expect(result.success).toBe(true)
    expect(result.data?.company).toBe('Google')
  })
})

describe('LoginSchema', () => {
  it('valide des identifiants corrects', () => {
    const result = LoginSchema.safeParse({ email: 'admin@school.fr', password: 'motdepasse' })
    expect(result.success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = LoginSchema.safeParse({ email: 'invalid', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejette un mot de passe vide', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('SignUpSchema', () => {
  const validSignUp = {
    email: 'nouveau@example.com',
    password: 'motdepasse123',
    firstName: 'Alice',
    lastName: 'Martin',
  }

  it('valide une inscription correcte', () => {
    expect(SignUpSchema.safeParse(validSignUp).success).toBe(true)
  })

  it('rejette un mot de passe trop court (< 8 chars)', () => {
    const result = SignUpSchema.safeParse({ ...validSignUp, password: 'court' })
    expect(result.success).toBe(false)
  })

  it('rejette un email invalide', () => {
    const result = SignUpSchema.safeParse({ ...validSignUp, email: 'pas-email' })
    expect(result.success).toBe(false)
  })

  it('assigne le rôle alumni par défaut', () => {
    const result = SignUpSchema.safeParse(validSignUp)
    expect(result.success).toBe(true)
    expect(result.data?.role).toBe('alumni')
  })
})
