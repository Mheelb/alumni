<script setup lang="ts">
import { ref } from 'vue'
import {
  useJobAnnouncements,
  useCreateJob,
  useUpdateJob,
  usePatchJobStatus,
  useDeleteJob,
} from '@/features/events/composables/useJobAnnouncements'
import JobAnnouncementForm from '@/features/events/components/JobAnnouncementForm.vue'
import {
  Button, Badge,
  Card, CardContent,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
import type { FeedJob, JobStatus } from '@/features/events/composables/useJobAnnouncements'
import type { JobAnnouncementInput } from '@alumni/shared-schema'

const { data: jobs, isLoading } = useJobAnnouncements()
const { mutate: createJob } = useCreateJob()
const { mutate: updateJob } = useUpdateJob()
const { mutate: patchStatus } = usePatchJobStatus()
const { mutate: deleteJob } = useDeleteJob()

const showForm = ref(false)
const editingJob = ref<FeedJob | null>(null)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)

function openCreate() {
  editingJob.value = null
  showForm.value = true
}

function openEdit(job: FeedJob) {
  editingJob.value = job
  showForm.value = true
}

function openDelete(id: string) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

function handleSubmit(data: JobAnnouncementInput) {
  if (editingJob.value) {
    updateJob({ id: editingJob.value._id, data: data as Record<string, unknown> }, {
      onSuccess: () => { showForm.value = false },
    })
  } else {
    createJob(data as Record<string, unknown>, {
      onSuccess: () => { showForm.value = false },
    })
  }
}

function handleStatusChange(id: string, status: string) {
  patchStatus({ id, status: status as JobStatus })
}

function confirmDelete() {
  if (!deletingId.value) return
  deleteJob(deletingId.value, {
    onSuccess: () => {
      showDeleteConfirm.value = false
      deletingId.value = null
    },
  })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

</script>

<template>
  <div class="container py-8 space-y-6 max-w-7xl">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Annonces d'emploi</h1>
        <p class="text-muted-foreground text-sm mt-1">Gérez les offres d'emploi publiées sur la plateforme.</p>
      </div>
      <Button class="gap-2" @click="openCreate">
        <Plus class="h-4 w-4" />
        Créer une annonce
      </Button>
    </div>

    <Card>
      <CardContent class="p-0">
        <div v-if="isLoading" class="flex justify-center py-16">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="!jobs?.length" class="text-center py-16 text-muted-foreground text-sm">
          Aucune annonce. Créez la première !
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Publié le</TableHead>
              <TableHead class="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="job in jobs" :key="job._id">
              <TableCell class="font-medium">{{ job.title }}</TableCell>
              <TableCell class="text-muted-foreground">{{ job.company }}</TableCell>
              <TableCell>
                <Badge variant="outline">{{ job.type }}</Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ job.location }}</TableCell>
              <TableCell>
                <Select :model-value="job.status" @update:model-value="handleStatusChange(job._id, $event)">
                  <SelectTrigger class="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="closed">Clôturé</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ formatDate(job.createdAt) }}</TableCell>
              <TableCell>
                <div class="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" class="h-8 w-8 p-0" @click="openEdit(job)">
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" class="h-8 w-8 p-0 text-destructive hover:text-destructive" @click="openDelete(job._id)">
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
          <SheetTitle>{{ editingJob ? 'Modifier l\'annonce' : 'Créer une annonce' }}</SheetTitle>
          <SheetDescription>
            {{ editingJob ? 'Modifiez les informations de l\'annonce.' : 'Renseignez les informations de la nouvelle annonce.' }}
          </SheetDescription>
        </SheetHeader>
        <JobAnnouncementForm
          :initial="editingJob ?? undefined"
          @submit="handleSubmit"
          @cancel="showForm = false"
        />
      </SheetContent>
    </Sheet>

    <!-- Delete confirm dialog -->
    <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Supprimer l'annonce</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. L'annonce et tous les intérêts associés seront supprimés.
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
