<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import {
  useAlumniList,
  useDeactivateAlumni,
  useDeleteAlumni,
  exportAlumniCsv,
  type AlumniFilters,
  type AlumniDetail,
} from '@/features/alumni/composables/useAlumni'
import AlumniSheet from '@/features/alumni/components/AlumniSheet.vue'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'
import AlumniDeleteDialog from '@/features/alumni/components/AlumniDeleteDialog.vue'
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarFallback,
} from '@/components/ui'
import {
  Plus,
  Download,
  Search,
  X,
  Eye,
  Pencil,
  UserX,
  Trash2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-vue-next'

const router = useRouter()
const isAdmin = ref(false)

onMounted(async () => {
  const { data: session } = await authClient.getSession()
  console.log('Session au montage:', session)
  isAdmin.value = session?.user?.role === 'admin'
})

// Filters & pagination
const filters = ref<AlumniFilters>({
  search: '',
  graduationYear: '',
  diploma: '',
  status: '',
  city: '',
  company: '',
  page: 1,
  limit: 20,
})

const { data, isLoading, isError } = useAlumniList(filters)

const alumni = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)
const pages = computed(() => data.value?.pages ?? 1)
const currentPage = computed(() => filters.value.page ?? 1)

function setPage(p: number) {
  filters.value = { ...filters.value, page: p }
}

function resetFilters() {
  filters.value = { search: '', graduationYear: '', diploma: '', status: '', city: '', company: '', page: 1, limit: 20 }
}

const hasActiveFilters = computed(() =>
  !!(filters.value.search || filters.value.graduationYear || filters.value.diploma ||
     filters.value.status || filters.value.city || filters.value.company),
)

// Sheet create/edit
const sheetOpen = ref(false)
const sheetMode = ref<'create' | 'edit'>('create')
const selectedAlumni = ref<AlumniDetail | undefined>(undefined)

function openCreate() {
  sheetMode.value = 'create'
  selectedAlumni.value = undefined
  sheetOpen.value = true
}

function openEdit(row: AlumniDetail) {
  sheetMode.value = 'edit'
  selectedAlumni.value = row
  sheetOpen.value = true
}

// Delete dialog
const deleteDialogOpen = ref(false)
const deleteMode = ref<'deactivate' | 'delete'>('deactivate')
const targetAlumni = ref<AlumniDetail | undefined>(undefined)

function openDeactivate(row: AlumniDetail) {
  deleteMode.value = 'deactivate'
  targetAlumni.value = row
  deleteDialogOpen.value = true
}

function openDelete(row: AlumniDetail) {
  deleteMode.value = 'delete'
  targetAlumni.value = row
  deleteDialogOpen.value = true
}

const deactivateMutation = useDeactivateAlumni()
const deleteMutation = useDeleteAlumni()

const isActionPending = computed(
  () => deactivateMutation.isPending.value || deleteMutation.isPending.value,
)

async function handleDeleteConfirm() {
  if (!targetAlumni.value) return
  if (deleteMode.value === 'deactivate') {
    await deactivateMutation.mutateAsync(targetAlumni.value._id)
  } else {
    await deleteMutation.mutateAsync(targetAlumni.value._id)
  }
  deleteDialogOpen.value = false
}

// Avatar initials
function getInitials(a: AlumniDetail) {
  return `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase()
}

// Export
function handleExport() {
  exportAlumniCsv(filters.value)
}

// Promotion years for filter select
const currentYear = new Date().getFullYear()
const promoYears = Array.from({ length: 30 }, (_, i) => currentYear - i)
</script>

<template>
  <div class="container py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Annuaire des diplômés</h1>
        <p class="text-muted-foreground text-sm mt-1">
          {{ isLoading ? '…' : `${total} profil${total > 1 ? 's' : ''}` }}
        </p>
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <Button variant="outline" size="sm" class="gap-2" @click="handleExport">
          <Download class="h-4 w-4" />
          Exporter CSV
        </Button>
        <Button size="sm" class="gap-2" @click="openCreate">
          <Plus class="h-4 w-4" />
          Nouveau profil
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex flex-wrap gap-3">
        <!-- Recherche -->
        <div class="relative w-[260px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="filters.search"
            placeholder="Rechercher par nom ou email…"
            class="pl-9"
            @input="filters.page = 1"
          />
        </div>

        <!-- Promotion -->
        <Select
          :model-value="String(filters.graduationYear || '_all')"
          @update:model-value="(v) => { filters = { ...filters, graduationYear: v === '_all' ? '' : Number(v), page: 1 } }"
        >
          <SelectTrigger class="w-[130px]">
            <SelectValue placeholder="Promotion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Toutes les promos</SelectItem>
            <SelectItem v-for="year in promoYears" :key="year" :value="String(year)">
              {{ year }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Statut -->
        <Select
          :model-value="filters.status || '_all'"
          @update:model-value="(v) => { filters = { ...filters, status: v === '_all' ? '' : v, page: 1 } }"
        >
          <SelectTrigger class="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les statuts</SelectItem>
            <SelectItem value="invited">Invité</SelectItem>
            <SelectItem value="registered">Inscrit</SelectItem>
            <SelectItem value="completed">Profil complété</SelectItem>
          </SelectContent>
        </Select>

        <!-- Ville -->
        <Input
          v-model="filters.city"
          placeholder="Ville"
          class="w-[130px]"
          @input="filters.page = 1"
        />

        <!-- Entreprise -->
        <Input
          v-model="filters.company"
          placeholder="Entreprise"
          class="w-[140px]"
          @input="filters.page = 1"
        />

        <!-- Reset -->
        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          class="gap-1 text-muted-foreground"
          @click="resetFilters"
        >
          <X class="h-4 w-4" />
          Réinitialiser
        </Button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-lg border bg-card shadow-sm">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 class="h-5 w-5 animate-spin" />
        Chargement…
      </div>

      <!-- Error -->
      <div v-else-if="isError" class="flex items-center justify-center py-20 text-destructive">
        Impossible de charger les profils.
      </div>

      <!-- Empty -->
      <div v-else-if="alumni.length === 0" class="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <p class="text-sm">Aucun profil trouvé.</p>
        <Button size="sm" variant="outline" @click="openCreate">Créer le premier profil</Button>
      </div>

      <!-- Data -->
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[48px]"></TableHead>
            <TableHead>Nom</TableHead>
            <TableHead class="hidden md:table-cell">Email</TableHead>
            <TableHead class="hidden lg:table-cell">Promotion</TableHead>
            <TableHead class="hidden lg:table-cell">Diplôme</TableHead>
            <TableHead class="hidden xl:table-cell">Entreprise</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in alumni" :key="row._id">
            <!-- Avatar -->
            <TableCell class="py-3">
              <Avatar class="h-8 w-8">
                <AvatarFallback class="text-xs">{{ getInitials(row) }}</AvatarFallback>
              </Avatar>
            </TableCell>

            <!-- Nom -->
            <TableCell class="font-medium">
              <button
                class="hover:underline text-left"
                @click="router.push('/annuaire/' + row._id)"
              >
                {{ row.firstName }} {{ row.lastName }}
              </button>
              <div class="text-xs text-muted-foreground md:hidden">{{ row.email }}</div>
            </TableCell>

            <!-- Email -->
            <TableCell class="hidden md:table-cell text-muted-foreground text-sm">
              {{ row.email }}
            </TableCell>

            <!-- Promotion -->
            <TableCell class="hidden lg:table-cell text-sm">
              {{ row.graduationYear ?? '—' }}
            </TableCell>

            <!-- Diplôme -->
            <TableCell class="hidden lg:table-cell text-sm">
              {{ row.diploma ?? '—' }}
            </TableCell>

            <!-- Entreprise -->
            <TableCell class="hidden xl:table-cell text-sm">
              <div>{{ row.company ?? '—' }}</div>
              <div v-if="row.jobTitle" class="text-xs text-muted-foreground">{{ row.jobTitle }}</div>
            </TableCell>

            <!-- Statut -->
            <TableCell>
              <AlumniStatusBadge :status="row.status" />
            </TableCell>

            <!-- Actions inline -->
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  title="Voir le profil"
                  @click="router.push('/annuaire/' + row._id)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <template v-if="isAdmin">
                  <Button
                    v-if="row.status === 'invited'"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Créer un compte"
                    @click="router.push('/admin/create-account/' + row._id)"
                  >
                    <UserPlus class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    title="Modifier"
                    @click="openEdit(row)"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title="Désactiver"
                    @click="openDeactivate(row)"
                  >
                    <UserX class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer"
                    @click="openDelete(row)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </template>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="pages > 1" class="flex items-center justify-between px-4 py-3 border-t">
        <p class="text-sm text-muted-foreground">
          Page {{ currentPage }} sur {{ pages }}
        </p>
        <div class="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="currentPage <= 1"
            @click="setPage(currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button
            v-for="p in pages"
            :key="p"
            variant="outline"
            size="sm"
            class="h-8 w-8 px-0"
            :class="p === currentPage ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''"
            @click="setPage(p)"
          >
            {{ p }}
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="currentPage >= pages"
            @click="setPage(currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sheet créer/modifier -->
  <AlumniSheet
    :open="sheetOpen"
    :mode="sheetMode"
    :alumni="selectedAlumni"
    @update:open="sheetOpen = $event"
    @success="sheetOpen = false"
  />

  <!-- Dialog confirmation -->
  <AlumniDeleteDialog
    :open="deleteDialogOpen"
    :mode="deleteMode"
    :alumni-name="targetAlumni ? `${targetAlumni.firstName} ${targetAlumni.lastName}` : ''"
    :is-pending="isActionPending"
    @update:open="deleteDialogOpen = $event"
    @confirm="handleDeleteConfirm"
  />
</template>
