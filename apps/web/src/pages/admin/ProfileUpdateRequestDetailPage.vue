<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  useProfileUpdateRequestDetail, 
  useAcceptProfileUpdateRequest, 
  useRefuseProfileUpdateRequest 
} from '@/features/alumni/composables/useProfileUpdateRequests'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { 
  Loader2, 
  ChevronLeft, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowRight
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const { data: request, isLoading, isError } = useProfileUpdateRequestDetail(() => id.value)

const acceptMutation = useAcceptProfileUpdateRequest()
const refuseMutation = useRefuseProfileUpdateRequest()

const isActionPending = computed(() => acceptMutation.isPending.value || refuseMutation.isPending.value)

async function handleAccept() {
  if (!request.value) return
  await acceptMutation.mutateAsync(request.value._id)
  router.push('/admin/demandes')
}

async function handleRefuse() {
  if (!request.value) return
  await refuseMutation.mutateAsync(request.value._id)
  router.push('/admin/demandes')
}

const fieldsToCompare = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'graduationYear', label: 'Promotion' },
  { key: 'diploma', label: 'Diplôme' },
  { key: 'company', label: 'Entreprise' },
  { key: 'jobTitle', label: 'Poste' },
  { key: 'city', label: 'Ville' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return { label: 'En attente', variant: 'outline', icon: Clock, class: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'accepted': return { label: 'Acceptée', variant: 'secondary', icon: CheckCircle, class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'refused': return { label: 'Refusée', variant: 'destructive', icon: XCircle, class: '' }
    default: return { label: status, variant: 'outline', icon: Clock, class: '' }
  }
}

function hasChange(key: string) {
  return request.value && key in request.value.changes
}

function formatValue(val: any) {
  if (val === null || val === undefined || val === '') return '—'
  return val
}
</script>

<template>
  <div class="container py-8 max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" class="gap-2 -ml-2" @click="router.push('/admin/demandes')">
      <ChevronLeft class="h-4 w-4" />
      Retour aux demandes
    </Button>

    <div v-if="isLoading" class="flex items-center justify-center py-20 text-muted-foreground gap-2">
      <Loader2 class="h-5 w-5 animate-spin" />
      Chargement de la demande...
    </div>

    <div v-else-if="isError || !request" class="text-center py-20 text-destructive">
      Demande introuvable.
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Détail de la demande</h1>
          <p class="text-muted-foreground text-sm mt-1">
            Revue des modifications pour le profil de {{ request.alumniId.firstName }} {{ request.alumniId.lastName }}
          </p>
        </div>
        <Badge :variant="getStatusBadge(request.status).variant as any" :class="cn('gap-1 px-3 py-1', getStatusBadge(request.status).class)">
          <component :is="getStatusBadge(request.status).icon" class="h-3.5 w-3.5" />
          {{ getStatusBadge(request.status).label }}
        </Badge>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Comparaison des données</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div v-for="field in fieldsToCompare" :key="field.key" class="grid grid-cols-2 gap-4 items-center p-3 rounded-lg border transition-colors" :class="hasChange(field.key) ? 'bg-amber-50/50 border-amber-200' : 'bg-transparent border-transparent'">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase text-muted-foreground">{{ field.label }}</p>
                  <p class="text-sm" :class="hasChange(field.key) ? 'line-through text-muted-foreground' : ''">
                    {{ formatValue((request.alumniId as any)[field.key]) }}
                  </p>
                </div>
                <div v-if="hasChange(field.key)" class="space-y-1">
                  <p class="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1">
                    <ArrowRight class="h-3 w-3" />
                    Modification demandée
                  </p>
                  <p class="text-sm font-bold text-amber-700">
                    {{ formatValue((request.changes as any)[field.key]) }}
                  </p>
                </div>
                <div v-else class="text-right">
                  <Badge variant="ghost" class="text-[10px] text-muted-foreground">Inchangé</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 text-sm">
              <div>
                <p class="text-xs text-muted-foreground">Demandé par</p>
                <p class="font-medium">{{ request.userId.name }}</p>
                <p class="text-xs text-muted-foreground">{{ request.userId.email }}</p>
              </div>
              <Separator />
              <div>
                <p class="text-xs text-muted-foreground">Date de demande</p>
                <p class="font-medium">{{ new Date(request.createdAt).toLocaleString('fr-FR') }}</p>
              </div>
            </CardContent>
          </Card>

          <div v-if="request.status === 'pending'" class="flex flex-col gap-2">
            <Button class="w-full gap-2" @click="handleAccept" :disabled="isActionPending">
              <CheckCircle class="h-4 w-4" />
              Accepter les changements
            </Button>
            <Button variant="destructive" class="w-full gap-2" @click="handleRefuse" :disabled="isActionPending">
              <XCircle class="h-4 w-4" />
              Refuser la demande
            </Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
