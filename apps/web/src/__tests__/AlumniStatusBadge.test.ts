import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'

describe('AlumniStatusBadge', () => {
  it('affiche "Sans compte" pour le statut unlinked', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'unlinked' } })
    expect(wrapper.text()).toContain('Sans compte')
  })

  it('affiche "Invité" pour le statut invited', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'invited' } })
    expect(wrapper.text()).toContain('Invité')
  })

  it('affiche "Inscrit" pour le statut registered', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'registered' } })
    expect(wrapper.text()).toContain('Inscrit')
  })

  it('rend un seul élément racine', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'registered' } })
    expect(wrapper.element).toBeTruthy()
  })
})
