import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { Ref } from 'vue'
import type { AlumniProfileType, AlumniUpdateType } from '@alumni/shared-schema'

export interface StatsData {
  total: number
  byStatus: { invited: number; registered: number; completed: number }
  activationRate: number
  recentAlumni: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    status: string
    createdAt: string
  }>
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface AlumniFilters {
  search?: string
  graduationYear?: number | ''
  diploma?: string
  status?: string
  city?: string
  company?: string
  page?: number
  limit?: number
}

export interface AlumniListResponse {
  status: string
  data: (AlumniProfileType & { _id: string; createdAt: string; updatedAt: string })[]
  total: number
  page: number
  pages: number
}

export function useAlumniList(filters: Ref<AlumniFilters>) {
  return useQuery({
    queryKey: ['alumni', filters],
    queryFn: async (): Promise<AlumniListResponse> => {
      const params: Record<string, string | number> = {}
      const f = filters.value
      if (f.search) params.search = f.search
      if (f.graduationYear) params.graduationYear = f.graduationYear
      if (f.diploma) params.diploma = f.diploma
      if (f.status) params.status = f.status
      if (f.city) params.city = f.city
      if (f.company) params.company = f.company
      if (f.page) params.page = f.page
      if (f.limit) params.limit = f.limit
      const { data } = await axios.get(`${API}/alumni`, { params, withCredentials: true })
      return data
    },
  })
}

export type AlumniDetail = AlumniProfileType & { _id: string; createdAt: string; updatedAt: string }

export function useAlumniDetail(id: Ref<string>) {
  return useQuery({
    queryKey: ['alumni', id],
    queryFn: async (): Promise<AlumniDetail> => {
      const { data } = await axios.get(`${API}/alumni/${id.value}`, { withCredentials: true })
      return data.data
    },
    enabled: () => !!id.value,
  })
}

export function useCreateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AlumniProfileType) =>
      axios.post(`${API}/alumni`, body, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useUpdateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AlumniUpdateType }) =>
      axios.put(`${API}/alumni/${id}`, body, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useDeactivateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.patch(`${API}/alumni/${id}/deactivate`, {}, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useDeleteAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${API}/alumni/${id}`, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useStats(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<StatsData> => {
      const { data } = await axios.get<{ status: string; data: StatsData }>(`${API}/stats`, {
        withCredentials: true,
      })
      return data.data
    },
    enabled,
  })
}

export function exportAlumniCsv(filters: AlumniFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.graduationYear) params.set('graduationYear', String(filters.graduationYear))
  if (filters.diploma) params.set('diploma', filters.diploma)
  if (filters.status) params.set('status', filters.status)
  if (filters.city) params.set('city', filters.city)
  if (filters.company) params.set('company', filters.company)
  const qs = params.toString()
  window.open(`${API}/alumni/export${qs ? '?' + qs : ''}`, '_blank')
}
