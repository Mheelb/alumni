import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import type { Ref } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface DashboardStats {
  total: number
  byStatus: { unlinked: number; invited: number; registered: number }
  activationRate: number
  employmentRate: number
  freelanceRate: number
  byGraduationYear: Array<{ year: number; count: number }>
  byCity: Array<{ city: string; count: number }>
  byCompany: Array<{ company: string; count: number }>
  byDiploma: Array<{ diploma: string; count: number }>
  byCreatedYear: Array<{ year: number; count: number }>
  recentAlumni: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    status: 'unlinked' | 'invited' | 'registered'
    createdAt: string
  }>
}

export function useDashboardStats(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await axios.get(`${API}/dashboard/stats`, { withCredentials: true })
      return res.data.data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
