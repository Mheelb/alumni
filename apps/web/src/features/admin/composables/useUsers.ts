import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { Ref } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface UserAccount {
  id: string
  _id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  role: string
  graduationYear?: number
  alumniId?: string
  banned?: boolean
  banReason?: string
  createdAt: string
  updatedAt: string
}

export interface UserFilters {
  role?: string
  status?: string
}

export function useUsersList(filters?: Ref<UserFilters>) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async (): Promise<UserAccount[]> => {
      const params: Record<string, string> = {}
      if (filters?.value.role) params.role = filters.value.role
      if (filters?.value.status) params.status = filters.value.status
      
      const { data } = await axios.get(`${API}/admin/users`, { 
        params,
        withCredentials: true 
      })
      return data.data
    },
  })
}

export function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      axios.patch(`${API}/admin/users/${userId}/toggle-status`, {}, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}
