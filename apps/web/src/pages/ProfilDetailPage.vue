<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import type { AppUser } from '@/types/user'
import { useAlumniDetail, useDeactivateAlumni, useDeleteAlumni } from '@/features/alumni/composables/useAlumni'
import type { AlumniDetail } from '@/features/alumni/composables/useAlumni'
import AlumniSheet from '@/features/alumni/components/AlumniSheet.vue'
import ProfileUpdateRequestDialog from '@/features/alumni/components/ProfileUpdateRequestDialog.vue'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'
import AlumniDeleteDialog from '@/features/alumni/components/AlumniDeleteDialog.vue'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
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
  FileEdit,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const isAdmin = ref(false)
const sessionUser = ref<any>(null)

onMounted(async () => {
  const { data: session } = await authClient.getSession()
  isAdmin.value = (session?.user as AppUser | undefined)?.role === 'admin'
  sessionUser.value = session?.user
})

const id = computed(() => route.params.id as string)
const { data: alumni, isLoading, isError } = useAlumniDetail(id)

// Messages notification
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)
function showMessage(type: 'success' | 'error', text: string) {
  message.value = { type, text }
  setTimeout(() => {
    if (message.value?.text === text) message.value = null
  }, 5000)
}

// Sheet edit (Admin)
const sheetOpen = ref(false)
function openEdit() {
  sheetOpen.value = true
}

// Request Dialog (Alumni)
const requestDialogOpen = ref(false)
function openRequest() {
  requestDialogOpen.value = true
}

function handleRequestSuccess() {
  requestDialogOpen.value = false
  showMessage('success', 'Votre demande de modification a été envoyée avec succès aux administrateurs.')
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
    <div class="flex items-center justify-between gap-4 -ml-2">
      <Button variant="ghost" size="sm" class="gap-2" @click="router.push('/annuaire')">
        <ChevronLeft class="h-4 w-4" />
        Retour à l'annuaire
      </Button>
    </div>

    <!-- Notification Message -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="message" 
        :class="cn(
          'p-4 rounded-lg border flex items-start gap-3 relative',
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-destructive/10 border-destructive/20 text-destructive'
        )"
      >
        <CheckCircle2 v-if="message.type === 'success'" class="h-5 w-5 shrink-0 mt-0.5" />
        <AlertCircle v-else class="h-5 w-5 shrink-0 mt-0.5" />
        <p class="text-sm font-medium pr-8">{{ message.text }}</p>
        <button 
          @click="message = null"
          class="absolute top-4 right-4 text-emerald-600 hover:text-emerald-900"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </Transition>

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
                <AvatarImage v-if="alumni.avatarUrl" :src="alumni.avatarUrl" :alt="`${alumni.firstName} ${alumni.lastName}`" />
                <AvatarFallback class="text-xl font-semibold">{{ getInitials(alumni) }}</AvatarFallback>
              </Avatar>
              <div class="space-y-1">
                <h2 class="text-xl font-bold">{{ alumni.firstName }} {{ alumni.lastName }}</h2>
                <div class="flex items-center gap-2 flex-wrap">
                  <AlumniStatusBadge v-if="isAdmin" :status="alumni.status ?? 'unlinked'" />
                  <Badge v-if="!alumni.isActive" variant="destructive" class="text-xs">Désactivé</Badge>
                </div>
                <p class="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail class="h-3.5 w-3.5" />
                  {{ alumni.email }}
                </p>
              </div>
            </div>
<<<<<<< HEAD
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
=======
            <div class="flex flex-wrap gap-2 items-center justify-start sm:justify-end mt-4 sm:mt-0">
              <template v-if="isAdmin">
                <Button v-if="alumni.status === 'invited'" variant="outline" size="sm" class="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" @click="router.push('/admin/create-account/' + alumni._id)">
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
              </template>
              <template v-else>
                <Button variant="outline" size="sm" class="gap-2" @click="openRequest">
                  <FileEdit class="h-4 w-4" />
                  Demander une modification
                </Button>
              </template>
>>>>>>> 0a50c8c (add system of modification demande)
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
              <AlumniStatusBadge :status="alumni.status ?? 'unlinked'" />
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

  <!-- Sheet modifier (Admin) -->
  <AlumniSheet
    :open="sheetOpen"
    mode="edit"
    :alumni="alumni"
    @update:open="sheetOpen = $event"
    @success="sheetOpen = false"
  />

  <!-- Dialog de demande (Alumni) -->
  <ProfileUpdateRequestDialog
    v-if="alumni"
    :open="requestDialogOpen"
    :alumni="alumni"
    @update:open="requestDialogOpen = $event"
    @success="handleRequestSuccess"
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
