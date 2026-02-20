import { describe, it, expect } from 'vitest'

function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

describe('getInitials', () => {
  it('retourne les initiales d\'un nom complet', () => {
    expect(getInitials('Jean Dupont')).toBe('JD')
  })

  it('retourne la première lettre pour un prénom seul', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('retourne une chaîne vide pour une entrée vide', () => {
    expect(getInitials('')).toBe('')
  })

  it('retourne une chaîne vide sans argument', () => {
    expect(getInitials()).toBe('')
  })

  it('limite à 2 caractères pour 3 mots ou plus', () => {
    expect(getInitials('Jean Paul Martin')).toBe('JP')
  })

  it('met les initiales en majuscules', () => {
    expect(getInitials('alice martin')).toBe('AM')
  })
})
