import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { Ref } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type JobType = 'CDI' | 'CDD' | 'stage' | 'alternance' | 'freelance'
export type JobStatus = 'draft' | 'active' | 'closed'
export type JobInterestStatus = 'interested' | 'not_interested'

export interface FeedJob {
  _id: string
  title: string
  company: string
  type: JobType
  location: string
  description: string
  url: string | null
  status: JobStatus
  myInterest: JobInterestStatus | null
  createdAt: string
}

export function useJobAnnouncements(statusFilter?: Ref<string | undefined>) {
  return useQuery({
    queryKey: ['job-announcements', statusFilter],
    queryFn: async (): Promise<FeedJob[]> => {
      const params = statusFilter?.value ? `?status=${statusFilter.value}` : ''
      const res = await axios.get(`${API}/job-announcements${params}`, { withCredentials: true })
      return res.data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      axios.post(`${API}/job-announcements`, data, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-announcements'] }),
  })
}

export function useUpdateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      axios.put(`${API}/job-announcements/${id}`, data, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-announcements'] }),
  })
}

export function usePatchJobStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      axios.patch(`${API}/job-announcements/${id}/status`, { status }, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-announcements'] }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${API}/job-announcements/${id}`, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-announcements'] }),
  })
}

export function useUpsertJobInterest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: JobInterestStatus }) =>
      axios.post(`${API}/job-announcements/${jobId}/interest`, { status }, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-announcements'] }),
  })
}
