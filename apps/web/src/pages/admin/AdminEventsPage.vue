<script setup lang="ts">
import { ref } from 'vue'
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@/features/events/composables/useEvents'
import EventForm from '@/features/events/components/EventForm.vue'
import {
  Button, Badge,
  Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui'
import { Plus, Pencil, Trash2, Loader2, MapPin, Users } from 'lucide-vue-next'
import type { FeedEvent } from '@/features/events/composables/useEvents'
import type { EventInput } from '@alumni/shared-schema'

const { data: events, isLoading } = useEvents()
const { mutate: createEvent } = useCreateEvent()
const { mutate: updateEvent } = useUpdateEvent()
const { mutate: deleteEvent } = useDeleteEvent()

const showForm = ref(false)
const editingEvent = ref<FeedEvent | null>(null)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)

function openCreate() {
  editingEvent.value = null
  showForm.value = true
}

function openEdit(event: FeedEvent) {
  editingEvent.value = event
  showForm.value = true
}

function openDelete(id: string) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

function handleSubmit(data: EventInput) {
  if (editingEvent.value) {
    updateEvent({ id: editingEvent.value._id, data: data as Record<string, unknown> }, {
      onSuccess: () => { showForm.value = false },
    })
  } else {
    createEvent(data as Record<string, unknown>, {
      onSuccess: () => { showForm.value = false },
    })
  }
}

function confirmDelete() {
  if (!deletingId.value) return
  deleteEvent(deletingId.value, {
    onSuccess: () => {
      showDeleteConfirm.value = false
      deletingId.value = null
    },
  })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(s: string) {
  if (s === 'upcoming') return 'À venir'
  if (s === 'ongoing') return 'En cours'
  return 'Passé'
}

function statusVariant(s: string): 'default' | 'secondary' | 'outline' {
  if (s === 'upcoming') return 'default'
  if (s === 'ongoing') return 'secondary'
  return 'outline'
}
</script>

<template>
  <div class="container py-8 space-y-6 max-w-7xl">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Événements</h1>
        <p class="text-muted-foreground text-sm mt-1">Gérez les événements de la plateforme alumni.</p>
      </div>
      <Button class="gap-2" @click="openCreate">
        <Plus class="h-4 w-4" />
        Créer un événement
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <div v-if="isLoading" class="flex justify-center py-16">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="!events?.length" class="text-center py-16 text-muted-foreground text-sm">
          Aucun événement. Créez le premier !
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead class="text-right">Participants</TableHead>
              <TableHead class="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="event in events" :key="event._id">
              <TableCell class="font-medium">{{ event.title }}</TableCell>
              <TableCell class="text-muted-foreground flex items-center gap-1">
                <MapPin class="h-3.5 w-3.5 shrink-0" />{{ event.location }}
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ formatDate(event.startDate) }}</TableCell>
              <TableCell>
                <Badge :variant="statusVariant(event.status)">{{ statusLabel(event.status) }}</Badge>
              </TableCell>
              <TableCell class="text-right text-sm text-muted-foreground">
                <span class="flex items-center justify-end gap-1">
                  <Users class="h-3.5 w-3.5" />
                  {{ event.attendanceCounts.going }}
                </span>
              </TableCell>
              <TableCell>
                <div class="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" class="h-8 w-8 p-0" @click="openEdit(event)">
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" class="h-8 w-8 p-0 text-destructive hover:text-destructive" @click="openDelete(event._id)">
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Form sheet -->
    <Sheet :open="showForm" @update:open="showForm = $event">
      <SheetContent side="right" class="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader class="mb-6">
          <SheetTitle>{{ editingEvent ? 'Modifier l\'événement' : 'Créer un événement' }}</SheetTitle>
          <SheetDescription>
            {{ editingEvent ? 'Modifiez les informations de l\'événement.' : 'Renseignez les informations du nouvel événement.' }}
          </SheetDescription>
        </SheetHeader>
        <EventForm
          :initial="editingEvent ?? undefined"
          @submit="handleSubmit"
          @cancel="showForm = false"
        />
      </SheetContent>
    </Sheet>

    <!-- Delete confirm dialog -->
    <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer l'événement</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. L'événement et toutes les participations associées seront supprimés.
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="showDeleteConfirm = false">Annuler</Button>
          <Button variant="destructive" @click="confirmDelete">Supprimer</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
