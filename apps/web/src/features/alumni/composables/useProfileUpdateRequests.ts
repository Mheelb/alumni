import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { ProfileUpdateRequestType, AlumniUpdateType } from '@alumni/shared-schema'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface ProfileUpdateRequestDetail extends ProfileUpdateRequestType {
  _id: string
  createdAt: string
  updatedAt: string
  alumniId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    [key: string]: any
  }
  userId: {
    _id: string
    name: string
    email: string
  }
}

export function useProfileUpdateRequests(filters: { status?: string; search?: string; date?: string } = {}, enabled: any = true) {
  return useQuery({
    queryKey: ['profile-update-requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.date) params.append('date', filters.date)
      
      const { data } = await axios.get<{ data: ProfileUpdateRequestDetail[] }>(
        `${API}/profile-update-requests?${params.toString()}`,
        { withCredentials: true },
      )
      return data.data
    },
    enabled,
  })
}

export function useProfileUpdateRequestDetail(id: string | (() => string)) {
  const requestId = typeof id === 'function' ? id : () => id
  return useQuery({
    queryKey: ['profile-update-requests', requestId],
    queryFn: async () => {
      const { data } = await axios.get<{ data: ProfileUpdateRequestDetail }>(
        `${API}/profile-update-requests/${requestId()}`,
        { withCredentials: true },
      )
      return data.data
    },
    enabled: () => !!requestId(),
  })
}

export function useCreateProfileUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { alumniId: string; changes: AlumniUpdateType }) => {
      const { data } = await axios.post(`${API}/profile-update-requests`, payload, {
        withCredentials: true,
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] })
    },
  })
}

export function useAcceptProfileUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch(
        `${API}/profile-update-requests/${id}/accept`,
        {},
        { withCredentials: true },
      )
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests', id] })
      queryClient.invalidateQueries({ queryKey: ['alumni'] })
    },
  })
}

export function useRefuseProfileUpdateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.patch(
        `${API}/profile-update-requests/${id}/refuse`,
        {},
        { withCredentials: true },
      )
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests', id] })
    },
  })
}
