<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { MapPin, ExternalLink, ThumbsUp } from 'lucide-vue-next'
import type { FeedJob, JobInterestStatus } from '../composables/useJobAnnouncements'

const props = defineProps<{ job: FeedJob }>()
const emit = defineEmits<{ interest: [payload: { jobId: string; status: JobInterestStatus }] }>()

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function toggleInterest() {
  const newStatus: JobInterestStatus = props.job.myInterest === 'interested' ? 'not_interested' : 'interested'
  emit('interest', { jobId: props.job._id, status: newStatus })
}
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-sm font-medium text-muted-foreground">{{ job.company }}</p>
          <CardTitle class="text-base leading-tight mt-0.5">{{ job.title }}</CardTitle>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <Badge v-if="job.status === 'active'" variant="default">Actif</Badge>
          <Badge v-else-if="job.status === 'closed'" variant="destructive">Clôturée</Badge>
          <Badge variant="outline">{{ job.type }}</Badge>
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm text-muted-foreground mt-1">
        <span class="flex items-center gap-1"><MapPin class="h-3.5 w-3.5" />{{ job.location }}</span>
        <span>{{ formatDate(job.createdAt) }}</span>
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <p class="text-sm line-clamp-3 text-muted-foreground">{{ job.description }}</p>
      <div class="flex items-center gap-2 flex-wrap">
        <a
          v-if="job.url"
          :href="job.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-sm underline underline-offset-2 text-primary"
        >
          Voir l'offre <ExternalLink class="h-3.5 w-3.5" />
        </a>
        <Button
          v-if="job.status !== 'closed'"
          data-testid="btn-interested"
          size="sm"
          :variant="job.myInterest === 'interested' ? 'default' : 'outline'"
          :class="{ active: job.myInterest === 'interested' }"
          @click="toggleInterest"
        >
          <ThumbsUp class="h-3.5 w-3.5 mr-1" />
          {{ job.myInterest === 'interested' ? 'Intéressé(e) ✓' : 'Je suis intéressé(e)' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
