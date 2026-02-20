<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { useAlumniDetail, useDeactivateAlumni, useDeleteAlumni } from '@/features/alumni/composables/useAlumni'
import type { AlumniDetail } from '@/features/alumni/composables/useAlumni'
import AlumniSheet from '@/features/alumni/components/AlumniSheet.vue'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'
import AlumniDeleteDialog from '@/features/alumni/components/AlumniDeleteDialog.vue'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  Separator,
  Badge,
} from '@/components/ui'
import {
  ChevronLeft,
  Pencil,
  UserX,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Linkedin,
  GraduationCap,
  Calendar,
  Loader2,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const isAdmin = ref(false)

onMounted(async () => {
  const { data: session } = await authClient.getSession()
  isAdmin.value = session?.user?.role === 'admin'
})

const id = computed(() => route.params.id as string)
const { data: alumni, isLoading, isError } = useAlumniDetail(id)

// Sheet edit
const sheetOpen = ref(false)
function openEdit() {
  sheetOpen.value = true
}

// Delete dialog
const deleteDialogOpen = ref(false)
const deleteMode = ref<'deactivate' | 'delete'>('deactivate')

function openDeactivate() {
  deleteMode.value = 'deactivate'
  deleteDialogOpen.value = true
}

function openDelete() {
  deleteMode.value = 'delete'
  deleteDialogOpen.value = true
}

const deactivateMutation = useDeactivateAlumni()
const deleteMutation = useDeleteAlumni()
const isActionPending = computed(
  () => deactivateMutation.isPending.value || deleteMutation.isPending.value,
)

async function handleDeleteConfirm() {
  if (!alumni.value) return
  if (deleteMode.value === 'deactivate') {
    await deactivateMutation.mutateAsync(alumni.value._id)
    deleteDialogOpen.value = false
  } else {
    await deleteMutation.mutateAsync(alumni.value._id)
    router.push('/annuaire')
  }
}

function getInitials(a: AlumniDetail) {
  return `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="container py-8 max-w-4xl space-y-6">
    <!-- Retour -->
    <Button variant="ghost" size="sm" class="gap-2 -ml-2" @click="router.push('/annuaire')">
      <ChevronLeft class="h-4 w-4" />
      Retour à l'annuaire
    </Button>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted-foreground gap-2">
      <Loader2 class="h-5 w-5 animate-spin" />
      Chargement du profil…
    </div>

    <!-- Error -->
    <div v-else-if="isError || !alumni" class="text-center py-20 text-destructive">
      Profil introuvable.
    </div>

    <template v-else>
      <!-- Profile header card -->
      <Card>
        <CardContent class="p-6">
          <div class="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
            <div class="flex items-center gap-4">
              <Avatar class="h-16 w-16 text-lg">
                <AvatarFallback class="text-xl font-semibold">{{ getInitials(alumni) }}</AvatarFallback>
              </Avatar>
              <div class="space-y-1">
                <h2 class="text-xl font-bold">{{ alumni.firstName }} {{ alumni.lastName }}</h2>
                <div class="flex items-center gap-2 flex-wrap">
                  <AlumniStatusBadge v-if="isAdmin" :status="alumni.status" />
                  <Badge v-if="!alumni.isActive" variant="destructive" class="text-xs">Désactivé</Badge>
                </div>
                <p class="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail class="h-3.5 w-3.5" />
                  {{ alumni.email }}
                </p>
              </div>
            </div>
            <div v-if="isAdmin" class="flex flex-wrap gap-2 items-center justify-start sm:justify-end mt-4 sm:mt-0">
              <Button v-if="alumni.status === 'unlinked'" variant="outline" size="sm" class="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" @click="router.push('/admin/create-account/' + alumni._id)">
                <UserPlus class="h-4 w-4" />
                Créer un compte
              </Button>
              <Button variant="outline" size="sm" class="gap-2" @click="openEdit">
                <Pencil class="h-4 w-4" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" class="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50" @click="openDeactivate">
                <UserX class="h-4 w-4" />
                Désactiver
              </Button>
              <Button variant="destructive" size="sm" class="gap-2" @click="openDelete">
                <Trash2 class="h-4 w-4" />
                Supprimer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Details grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Informations personnelles -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <GraduationCap class="h-4 w-4 text-primary" />
              Formation
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-start gap-3">
              <Calendar class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Promotion</p>
                <p class="text-sm font-medium">{{ alumni.graduationYear ?? '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <GraduationCap class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Diplôme</p>
                <p class="text-sm font-medium">{{ alumni.diploma ?? '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <MapPin class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Ville</p>
                <p class="text-sm font-medium">{{ alumni.city ?? '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <Phone class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Téléphone</p>
                <p class="text-sm font-medium">{{ alumni.phone ?? '—' }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Parcours professionnel -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base flex items-center gap-2">
              <Briefcase class="h-4 w-4 text-primary" />
              Parcours professionnel
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex items-start gap-3">
              <Building2 class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Entreprise</p>
                <p class="text-sm font-medium">{{ alumni.company ?? '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <Briefcase class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">Poste</p>
                <p class="text-sm font-medium">{{ alumni.jobTitle ?? '—' }}</p>
              </div>
            </div>
            <Separator />
            <div class="flex items-start gap-3">
              <Linkedin class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p class="text-xs text-muted-foreground">LinkedIn</p>
                <a
                  v-if="alumni.linkedinUrl"
                  :href="alumni.linkedinUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-medium text-primary hover:underline break-all"
                >
                  {{ alumni.linkedinUrl }}
                </a>
                <p v-else class="text-sm font-medium">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- System info -->
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base text-muted-foreground">Informations système</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p class="text-xs text-muted-foreground">Créé le</p>
              <p class="font-medium">{{ formatDate(alumni.createdAt) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Modifié le</p>
              <p class="font-medium">{{ formatDate(alumni.updatedAt) }}</p>
            </div>
            <div v-if="isAdmin">
              <p class="text-xs text-muted-foreground">Statut compte</p>
              <AlumniStatusBadge :status="alumni.status" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Actif</p>
              <p class="font-medium">{{ alumni.isActive ? 'Oui' : 'Non' }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>

  <!-- Sheet modifier -->
  <AlumniSheet
    :open="sheetOpen"
    mode="edit"
    :alumni="alumni"
    @update:open="sheetOpen = $event"
    @success="sheetOpen = false"
  />

  <!-- Dialog confirmation -->
  <AlumniDeleteDialog
    v-if="alumni"
    :open="deleteDialogOpen"
    :mode="deleteMode"
    :alumni-name="`${alumni.firstName} ${alumni.lastName}`"
    :is-pending="isActionPending"
    @update:open="deleteDialogOpen = $event"
    @confirm="handleDeleteConfirm"
  />
</template>
