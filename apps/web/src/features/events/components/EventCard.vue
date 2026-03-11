<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { MapPin, Calendar, Users, Star } from 'lucide-vue-next'
import type { FeedEvent, AttendanceStatus } from '../composables/useEvents'

const props = defineProps<{ event: FeedEvent }>()
const emit = defineEmits<{ attend: [payload: { eventId: string; status: AttendanceStatus }] }>()

const statusLabel = computed(() => {
  if (props.event.status === 'upcoming') return 'À venir'
  if (props.event.status === 'ongoing') return 'En cours'
  return 'Passé'
})

const statusVariant = computed((): 'default' | 'secondary' | 'outline' => {
  if (props.event.status === 'upcoming') return 'default'
  if (props.event.status === 'ongoing') return 'secondary'
  return 'outline'
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function attend(status: AttendanceStatus) {
  emit('attend', { eventId: props.event._id, status })
}
</script>

<template>
  <Card class="overflow-hidden">
    <img v-if="event.imageUrl" :src="event.imageUrl" class="h-40 w-full object-cover" alt="" />
    <CardHeader class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <CardTitle class="text-base leading-tight">{{ event.title }}</CardTitle>
        <Badge :variant="statusVariant" class="shrink-0">{{ statusLabel }}</Badge>
      </div>
      <div class="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
        <span class="flex items-center gap-1"><Calendar class="h-3.5 w-3.5" />{{ formatDate(event.startDate) }}</span>
        <span class="flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ event.location }}</span>
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <p class="text-sm line-clamp-3 text-muted-foreground">{{ event.description }}</p>
      <div class="flex items-center gap-3 text-xs text-muted-foreground">
        <span class="flex items-center gap-1"><Users class="h-3.5 w-3.5" />{{ event.attendanceCounts.going }} participants</span>
        <span class="flex items-center gap-1"><Star class="h-3.5 w-3.5" />{{ event.attendanceCounts.interested }} intéressés</span>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          data-testid="btn-going"
          size="sm"
          :variant="event.myAttendance === 'going' ? 'default' : 'outline'"
          :class="{ active: event.myAttendance === 'going' }"
          @click="attend('going')"
        >Je viens</Button>
        <Button
          data-testid="btn-interested"
          size="sm"
          :variant="event.myAttendance === 'interested' ? 'default' : 'outline'"
          :class="{ active: event.myAttendance === 'interested' }"
          @click="attend('interested')"
        >Intéressé(e)</Button>
        <Button
          data-testid="btn-not-going"
          size="sm"
          :variant="event.myAttendance === 'not_going' ? 'default' : 'outline'"
          :class="{ active: event.myAttendance === 'not_going' }"
          @click="attend('not_going')"
        >Je ne viens pas</Button>
      </div>
    </CardContent>
  </Card>
</template>
