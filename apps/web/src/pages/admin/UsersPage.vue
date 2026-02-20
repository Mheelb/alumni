<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { useUsersList, useToggleUserStatus, type UserAccount, type UserFilters } from '@/features/admin/composables/useUsers'
import {
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  AvatarFallback,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui'
import {
  UserX,
  UserCheck,
  Eye,
  Loader2,
  ShieldCheck,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-vue-next'

const router = useRouter()
const isAdmin = ref(false)

onMounted(async () => {
  const { data: session } = await authClient.getSession()
  isAdmin.value = session?.user?.role === 'admin'
})

// Filters
const filters = ref<UserFilters>({
  role: '',
  status: '',
})

const { data: users, isLoading, isError } = useUsersList(filters)
const toggleStatusMutation = useToggleUserStatus()

function resetFilters() {
  filters.value = { role: '', status: '' }
}

const hasActiveFilters = computed(() => !!(filters.value.role || filters.value.status))

// Status toggle dialog
const statusDialogOpen = ref(false)
const targetUser = ref<UserAccount | undefined>(undefined)

function openToggleStatus(user: UserAccount) {
  targetUser.value = user
  statusDialogOpen.value = true
}

async function handleToggleStatusConfirm() {
  if (!targetUser.value) return
  const userId = targetUser.value.id || targetUser.value._id
  await toggleStatusMutation.mutateAsync(userId)
  statusDialogOpen.value = false
  targetUser.value = undefined
}

// Avatar initials
function getInitials(u: UserAccount) {
  if (u.firstName && u.lastName) {
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
  }
  return u.name.substring(0, 2).toUpperCase()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="container py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Gestion des Comptes</h1>
        <p class="text-muted-foreground text-sm mt-1">
          {{ isLoading ? 'Chargement…' : `${users?.length ?? 0} compte${(users?.length ?? 0) > 1 ? 's' : ''} utilisateur` }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex flex-wrap gap-3">
        <!-- Rôle -->
        <Select
          :model-value="filters.role || '_all'"
          @update:model-value="(v) => { filters.role = v === '_all' ? '' : v }"
        >
          <SelectTrigger class="w-[160px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="alumni">Alumni</SelectItem>
          </SelectContent>
        </Select>

        <!-- État -->
        <Select
          :model-value="filters.status || '_all'"
          @update:model-value="(v) => { filters.status = v === '_all' ? '' : v }"
        >
          <SelectTrigger class="w-[160px]">
            <SelectValue placeholder="État" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les états</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>

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
    <div class="rounded-lg border bg-card shadow-sm overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 class="h-5 w-5 animate-spin" />
        Chargement des comptes…
      </div>

      <!-- Error -->
      <div v-else-if="isError" class="flex items-center justify-center py-20 text-destructive">
        Impossible de charger les comptes utilisateur.
      </div>

      <!-- Empty -->
      <div v-else-if="!users || users.length === 0" class="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <p class="text-sm">Aucun compte utilisateur trouvé.</p>
        <Button v-if="hasActiveFilters" variant="outline" size="sm" @click="resetFilters">
          Effacer les filtres
        </Button>
      </div>

      <!-- Data -->
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[48px]"></TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead class="hidden md:table-cell">Email</TableHead>
            <TableHead class="hidden md:table-cell">Rôle</TableHead>
            <TableHead>État</TableHead>
            <TableHead class="hidden xl:table-cell">Créé le</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in users" :key="user.id || user._id">
            <!-- Avatar -->
            <TableCell class="py-3">
              <Avatar class="h-8 w-8">
                <AvatarFallback class="text-xs bg-primary/10 text-primary font-medium">
                  {{ getInitials(user) }}
                </AvatarFallback>
              </Avatar>
            </TableCell>

            <!-- Nom -->
            <TableCell class="font-medium">
              <div class="flex flex-col">
                <span>{{ user.name }}</span>
                <span class="text-xs text-muted-foreground md:hidden">{{ user.email }}</span>
              </div>
            </TableCell>

            <!-- Email -->
            <TableCell class="hidden md:table-cell text-muted-foreground text-sm">
              {{ user.email }}
            </TableCell>

            <!-- Rôle -->
            <TableCell class="hidden md:table-cell">
              <Badge :variant="user.role === 'admin' ? 'default' : 'secondary'" class="capitalize font-normal">
                <ShieldCheck v-if="user.role === 'admin'" class="h-3 w-3 mr-1" />
                <User v-else class="h-3 w-3 mr-1" />
                {{ user.role }}
              </Badge>
            </TableCell>

            <!-- État -->
            <TableCell>
              <Badge v-if="user.banned" variant="destructive" class="flex items-center gap-1 w-fit font-normal">
                <XCircle class="h-3 w-3" />
                Inactif
              </Badge>
              <Badge v-else variant="outline" class="flex items-center gap-1 w-fit font-normal text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 class="h-3 w-3" />
                Actif
              </Badge>
            </TableCell>

            <!-- Créé le -->
            <TableCell class="hidden xl:table-cell text-sm text-muted-foreground">
              {{ formatDate(user.createdAt) }}
            </TableCell>

            <!-- Actions -->
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  v-if="user.alumniId"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  title="Voir le profil alumni"
                  @click="router.push('/annuaire/' + user.alumniId)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  v-if="user.role !== 'admin'"
                  variant="ghost"
                  size="icon"
                  :class="[
                    'h-8 w-8',
                    user.banned 
                      ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                      : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                  ]"
                  :title="user.banned ? 'Réactiver le compte' : 'Désactiver le compte'"
                  @click="openToggleStatus(user)"
                >
                  <UserCheck v-if="user.banned" class="h-4 w-4" />
                  <UserX v-else class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>

  <!-- Status Toggle Dialog -->
  <Dialog :open="statusDialogOpen" @update:open="statusDialogOpen = $event">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2" :class="targetUser?.banned ? 'text-green-600' : 'text-amber-600'">
          <AlertCircle class="h-5 w-5" />
          {{ targetUser?.banned ? 'Réactiver le compte' : 'Désactiver le compte' }}
        </DialogTitle>
        <DialogDescription>
          <template v-if="targetUser?.banned">
            Voulez-vous réactiver le compte de <strong>{{ targetUser?.name }}</strong> ? 
            L'utilisateur pourra à nouveau se connecter à la plateforme.
          </template>
          <template v-else>
            Voulez-vous désactiver le compte de <strong>{{ targetUser?.name }}</strong> ? 
            L'utilisateur ne pourra plus se connecter, mais ses données seront conservées.
          </template>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="mt-4">
        <Button variant="outline" @click="statusDialogOpen = false">Annuler</Button>
        <Button 
          :variant="targetUser?.banned ? 'default' : 'destructive'"
          :disabled="toggleStatusMutation.isPending.value"
          @click="handleToggleStatusConfirm"
          class="min-w-[120px]"
        >
          <Loader2 v-if="toggleStatusMutation.isPending.value" class="mr-2 h-4 w-4 animate-spin" />
          {{ targetUser?.banned ? 'Réactiver' : 'Désactiver' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
