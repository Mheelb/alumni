<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEvents, useUpsertAttendance } from '@/features/events/composables/useEvents'
import { useJobAnnouncements, useUpsertJobInterest } from '@/features/events/composables/useJobAnnouncements'
import EventCard from '@/features/events/components/EventCard.vue'
import JobAnnouncementCard from '@/features/events/components/JobAnnouncementCard.vue'
import { Button } from '@/components/ui'
import { Loader2, CalendarDays, Briefcase } from 'lucide-vue-next'
import type { AttendanceStatus } from '@/features/events/composables/useEvents'
import type { JobInterestStatus } from '@/features/events/composables/useJobAnnouncements'

const activeTab = ref<'events' | 'jobs'>('events')
const eventFilter = ref<'all' | 'upcoming' | 'ongoing' | 'past'>('all')

const { data: events, isLoading: eventsLoading } = useEvents()
const { data: jobs, isLoading: jobsLoading } = useJobAnnouncements()
const { mutate: upsertAttendance } = useUpsertAttendance()
const { mutate: upsertInterest } = useUpsertJobInterest()

const filteredEvents = computed(() => {
  if (!events.value) return []
  if (eventFilter.value === 'all') return events.value
  return events.value.filter(e => e.status === eventFilter.value)
})

const eventFilterLabels: Record<string, string> = {
  all: 'Tous',
  upcoming: 'À venir',
  ongoing: 'En cours',
  past: 'Passés',
}

function handleAttend({ eventId, status }: { eventId: string; status: AttendanceStatus }) {
  upsertAttendance({ eventId, status })
}

function handleInterest({ jobId, status }: { jobId: string; status: JobInterestStatus }) {
  upsertInterest({ jobId, status })
}
</script>

<template>
  <div class="container py-8 space-y-6 max-w-5xl">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Feed</h1>
      <p class="text-muted-foreground text-sm mt-1">Événements et opportunités du réseau alumni</p>
    </div>

    <!-- Tab buttons -->
    <div class="flex gap-1 bg-muted p-1 rounded-lg w-fit">
      <button
        :class="['flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors', activeTab === 'events' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground']"
        @click="activeTab = 'events'"
      >
        <CalendarDays class="h-4 w-4" />
        Événements
      </button>
      <button
        :class="['flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors', activeTab === 'jobs' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground']"
        @click="activeTab = 'jobs'"
      >
        <Briefcase class="h-4 w-4" />
        Annonces d'emploi
      </button>
    </div>

    <!-- Events tab -->
    <div v-if="activeTab === 'events'">
      <!-- Filters -->
      <div class="flex gap-2 flex-wrap mb-4">
        <Button
          v-for="(label, key) in eventFilterLabels"
          :key="key"
          :variant="eventFilter === key ? 'default' : 'outline'"
          size="sm"
          @click="eventFilter = key as typeof eventFilter"
        >
          {{ label }}
        </Button>
      </div>

      <div v-if="eventsLoading" class="flex justify-center py-16">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="filteredEvents.length === 0" class="text-center py-16 text-muted-foreground text-sm">
        Aucun événement dans cette catégorie.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <EventCard
          v-for="event in filteredEvents"
          :key="event._id"
          :event="event"
          @attend="handleAttend"
        />
      </div>
    </div>

    <!-- Jobs tab -->
    <div v-if="activeTab === 'jobs'">
      <div v-if="jobsLoading" class="flex justify-center py-16">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="!jobs?.filter(j => j.status !== 'draft').length" class="text-center py-16 text-muted-foreground text-sm">
        Aucune annonce d'emploi disponible pour le moment.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <JobAnnouncementCard
          v-for="job in jobs.filter(j => j.status !== 'draft')"
          :key="job._id"
          :job="job"
          @interest="handleInterest"
        />
      </div>
    </div>
  </div>
</template>
