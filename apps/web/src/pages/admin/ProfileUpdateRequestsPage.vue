<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileUpdateRequests } from '@/features/alumni/composables/useProfileUpdateRequests'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { Loader2, Eye, FileEdit, Clock, CheckCircle2, XCircle, Search, Calendar, X } from 'lucide-vue-next'

const router = useRouter()

const filters = reactive({
  status: 'pending', // Default to pending
  search: '',
  date: '',
})

const { data: requests, isLoading } = useProfileUpdateRequests(filters)

const hasActiveFilters = computed(() => !!(filters.search || filters.status || filters.date))

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'En attente', variant: 'outline', icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'accepted':
      return { label: 'Acceptée', variant: 'secondary', icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'refused':
      return { label: 'Refusée', variant: 'destructive', icon: XCircle, class: '' }
    default:
      return { label: status, variant: 'outline', icon: Clock, class: '' }
  }
}

const profileFields = [
  'firstName', 'lastName', 'graduationYear', 'diploma', 
  'company', 'jobTitle', 'city', 'phone', 'linkedinUrl'
]

function getChangesCount(changes: Record<string, any>) {
  if (!changes) return 0
  return Object.keys(changes).filter(key => profileFields.includes(key)).length
}

function resetFilters() {
  filters.status = ''
  filters.search = ''
  filters.date = ''
}
</script>

<template>
  <div class="container py-8 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Demandes de modification</h1>
        <p class="text-muted-foreground text-sm mt-1">
          Gérez les demandes de mise à jour des profils alumni.
        </p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="rounded-lg border bg-card p-4">
      <div class="flex flex-wrap gap-3">
        <!-- Recherche -->
        <div class="relative w-[260px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="filters.search"
            placeholder="Rechercher par nom ou email…"
            class="pl-9"
          />
        </div>

        <!-- Statut -->
        <Select
          :model-value="filters.status || '_all'"
          @update:model-value="(v) => filters.status = v === '_all' ? '' : v"
        >
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptée</SelectItem>
            <SelectItem value="refused">Refusée</SelectItem>
          </SelectContent>
        </Select>

        <!-- Date -->
        <div class="relative w-[180px]">
          <Input
            v-model="filters.date"
            type="date"
            class="[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-2 [&::-webkit-calendar-picker-indicator]:cursor-pointer pl-9"
          />
        </div>

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

    <Card>
      <CardHeader>
        <CardTitle class="text-base flex items-center gap-2">
          <FileEdit class="h-4 w-4" />
          {{ requests?.length ?? 0 }} demande(s) trouvée(s)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 class="h-5 w-5 animate-spin" />
          Chargement des demandes...
        </div>

        <div v-else-if="!requests || requests.length === 0" class="text-center py-12 text-muted-foreground">
          Aucune demande ne correspond à vos critères.
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Alumni</TableHead>
              <TableHead>Champs modifiés</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="req in requests" :key="req._id">
              <TableCell class="font-medium">
                {{ formatDate(req.createdAt) }}
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ req.alumniId?.firstName }} {{ req.alumniId?.lastName }}</div>
                <div class="text-xs text-muted-foreground">{{ req.alumniId?.email }}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" class="font-mono text-[10px]">
                  {{ getChangesCount(req.changes) }} champ(s)
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="getStatusBadge(req.status).variant as any" :class="cn('gap-1', getStatusBadge(req.status).class)">
                  <component :is="getStatusBadge(req.status).icon" class="h-3 w-3" />
                  {{ getStatusBadge(req.status).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="sm" class="gap-2" @click="router.push('/admin/demandes/' + req._id)">
                  <Eye class="h-4 w-4" />
                  Détails
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
