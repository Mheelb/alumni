import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import type { Ref } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type EventStatus = 'upcoming' | 'ongoing' | 'past'
export type AttendanceStatus = 'going' | 'interested' | 'not_going'

export interface FeedEvent {
  _id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  imageUrl: string | null
  status: EventStatus
  attendanceCounts: { going: number; interested: number }
  myAttendance: AttendanceStatus | null
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<FeedEvent[]> => {
      const res = await axios.get(`${API}/events`, { withCredentials: true })
      return res.data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useEvent(id: Ref<string>) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async (): Promise<FeedEvent> => {
      const res = await axios.get(`${API}/events/${id.value}`, { withCredentials: true })
      return res.data.data
    },
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      axios.post(`${API}/events`, data, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      axios.put(`${API}/events/${id}`, data, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${API}/events/${id}`, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpsertAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: AttendanceStatus }) =>
      axios.post(`${API}/events/${eventId}/attendance`, { status }, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
