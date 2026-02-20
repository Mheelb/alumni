<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { authClient } from '@/lib/auth-client'
import { useStats, exportAlumniCsv } from '@/features/alumni/composables/useAlumni'
import { useProfileUpdateRequests } from '@/features/alumni/composables/useProfileUpdateRequests'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/ui'
import {
  Users,
  UserCheck,
  UserPlus,
  Download,
  Calendar,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Loader2,
  Bell,
  FileEdit,
} from 'lucide-vue-next'

const router = useRouter()

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const isSessionPending = ref(true)
const isLoggedIn = ref(false)
const isAdmin = ref(false)
const firstName = ref('')
const myAlumniId = ref<string | null>(null)

onMounted(async () => {
  const { data: session } = await authClient.getSession()
  if (session) {
    isLoggedIn.value = true
    isAdmin.value = (session.user as { role?: string })?.role === 'admin'
    firstName.value = session.user?.name?.split(' ')[0] ?? ''
    if (!isAdmin.value) {
      try {
        const { data } = await axios.get<{ data: { _id: string } }>(`${API}/alumni/me`, { withCredentials: true })
        myAlumniId.value = data.data._id
      } catch {
        // profil alumni non trouvé, on reste sur l'annuaire
      }
    }
  }
  isSessionPending.value = false
})

const { data: stats, isLoading: statsLoading } = useStats(isAdmin)
const pendingFilters = reactive({ status: 'pending' as const })
const { data: pendingRequests, isLoading: requestsLoading } = useProfileUpdateRequests(pendingFilters, isAdmin)

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' => {
  if (status === 'registered') return 'default'
  if (status === 'invited') return 'secondary'
  return 'outline'
}

const statusLabel = (status: string) => {
  if (status === 'registered') return 'Inscrit'
  if (status === 'invited') return 'Invité'
  return 'Sans compte'
}
</script>

<template>
  <div class="flex-1 flex flex-col justify-center">
    <!-- Chargement de la session -->
    <div v-if="isSessionPending" class="flex items-center justify-center py-24 text-muted-foreground gap-2">
      <Loader2 class="h-5 w-5 animate-spin" />
    </div>

    <!-- ──────────────────────────────────────────────────
         VUE 1 : Non connecté — Landing page
    ─────────────────────────────────────────────────── -->
    <div v-else-if="!isLoggedIn" class="container flex flex-col items-center justify-center py-24 gap-8 text-center">
      <div class="flex flex-col items-center gap-4 max-w-xl">
        <h1 class="text-4xl font-bold tracking-tight">
          Gérez votre réseau de diplômés
        </h1>
        <p class="text-muted-foreground text-lg">
          My Digital School Alumnis centralise l'annuaire de vos diplômés, les événements et les offres d'emploi en un seul endroit.
        </p>
        <ul class="text-sm text-muted-foreground text-left space-y-2 mt-2">
          <li class="flex items-center gap-2">
            <Users class="h-4 w-4 shrink-0" />
            Annuaire complet des diplômés
          </li>
          <li class="flex items-center gap-2">
            <Calendar class="h-4 w-4 shrink-0" />
            Gestion des événements <span class="text-xs ml-1">(bientôt)</span>
          </li>
          <li class="flex items-center gap-2">
            <Briefcase class="h-4 w-4 shrink-0" />
            Annonces emploi <span class="text-xs ml-1">(bientôt)</span>
          </li>
        </ul>
        <Button size="lg" class="mt-4 gap-2" @click="router.push('/login')">
          Se connecter
          <ArrowRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- ──────────────────────────────────────────────────
         VUE 2 : Admin — Tableau de bord
    ─────────────────────────────────────────────────── -->
    <div v-else-if="isAdmin" class="container py-8 space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Bonjour, {{ firstName }}</h1>
        <p class="text-muted-foreground text-sm mt-1">Tableau de bord — My Digital School Alumnis</p>
      </div>

      <div v-if="statsLoading" class="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 class="h-4 w-4 animate-spin" />
        Chargement des statistiques…
      </div>

      <template v-else-if="stats">
        <!-- Stats cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users class="h-4 w-4" />
                Alumnis actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">{{ stats.total }}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp class="h-4 w-4" />
                Taux d'activation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-3xl font-bold">
                {{ stats.activationRate }}<span class="text-lg font-medium text-muted-foreground">%</span>
              </p>
              <p class="text-xs text-muted-foreground mt-1">alumni ayant créé son compte</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus class="h-4 w-4" />
                Répartition
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-1.5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Invités</span>
                <span class="font-medium">{{ stats.byStatus.invited }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">Inscrits</span>
                <span class="font-medium">{{ stats.byStatus.registered }}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bell class="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="requestsLoading" class="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 class="h-3 w-3 animate-spin" />
                Vérification...
              </div>
              <div v-else-if="pendingRequests && pendingRequests.length > 0">
                <button 
                  class="flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline text-left"
                  @click="router.push('/admin/demandes')"
                >
                  <FileEdit class="h-4 w-4" />
                  {{ pendingRequests.length }} demande(s) en attente
                </button>
              </div>
              <p v-else class="text-sm text-muted-foreground">Aucune notification</p>
            </CardContent>
          </Card>
        </div>

        <!-- Bas de page -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Derniers alumnis créés -->
          <Card class="lg:col-span-2">
            <CardHeader>
              <CardTitle class="text-base">Derniers alumnis créés</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="divide-y">
                <li
                  v-for="a in stats.recentAlumni"
                  :key="a._id"
                  class="flex items-center justify-between py-2.5 gap-4"
                >
                  <div>
                    <button
                      class="font-medium text-sm hover:underline text-left"
                      @click="router.push('/annuaire/' + a._id)"
                    >
                      {{ a.firstName }} {{ a.lastName }}
                    </button>
                    <div class="text-xs text-muted-foreground">{{ a.email }}</div>
                  </div>
                  <Badge :variant="statusBadgeVariant(a.status)" class="shrink-0 text-xs">
                    {{ statusLabel(a.status) }}
                  </Badge>
                </li>
              </ul>
              <Button
                variant="ghost"
                size="sm"
                class="mt-3 gap-1 text-muted-foreground w-full"
                @click="router.push('/annuaire')"
              >
                Voir tout l'annuaire
                <ArrowRight class="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>

          <!-- Colonne droite -->
          <div class="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle class="text-base">Accès rapides</CardTitle>
              </CardHeader>
              <CardContent class="flex flex-col gap-2">
                <Button variant="outline" class="justify-start gap-2" @click="router.push('/annuaire')">
                  <Users class="h-4 w-4" />
                  Annuaire
                </Button>
                <Button variant="outline" class="justify-start gap-2" @click="router.push('/admin/demandes')">
                  <FileEdit class="h-4 w-4" />
                  Demandes
                </Button>
                <Button variant="outline" class="justify-start gap-2" @click="exportAlumniCsv({})">
                  <Download class="h-4 w-4" />
                  Exporter CSV
                </Button>
              </CardContent>
            </Card>

            <Card class="opacity-60">
              <CardHeader>
                <CardTitle class="text-base flex items-center gap-2">
                  <Calendar class="h-4 w-4" />
                  Prochains événements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-sm text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>

            <Card class="opacity-60">
              <CardHeader>
                <CardTitle class="text-base flex items-center gap-2">
                  <Briefcase class="h-4 w-4" />
                  Annonces actives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-sm text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>
    </div>

    <!-- ──────────────────────────────────────────────────
         VUE 3 : Alumni connecté — Accueil personnalisé
    ─────────────────────────────────────────────────── -->
    <div v-else class="container py-8 space-y-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Bonjour, {{ firstName }}</h1>
        <p class="text-muted-foreground text-sm mt-1">Bienvenue sur la plateforme alumnis</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card class="cursor-pointer hover:shadow-md transition-shadow" @click="router.push('/annuaire')">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Users class="h-5 w-5 text-primary" />
              Annuaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground mb-4">
              Retrouvez d'anciens camarades et explorez le réseau des diplômés.
            </p>
            <Button variant="outline" size="sm" class="gap-1">
              Consulter
              <ArrowRight class="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="myAlumniId ? router.push('/annuaire/' + myAlumniId) : router.push('/annuaire')"
        >
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <UserCheck class="h-5 w-5 text-primary" />
              Mon profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground mb-4">
              Mettez à jour vos informations professionnelles et restez visible.
            </p>
            <Button variant="outline" size="sm" class="gap-1">
              Voir mon profil
              <ArrowRight class="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card class="opacity-60">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Calendar class="h-5 w-5" />
              Événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              Les prochains événements de votre école apparaîtront ici.
            </p>
            <p class="text-xs text-muted-foreground mt-3">Bientôt disponible</p>
          </CardContent>
        </Card>

        <Card class="opacity-60">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Briefcase class="h-5 w-5" />
              Annonces emploi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              Consultez et déposez des offres d'emploi dans le réseau.
            </p>
            <p class="text-xs text-muted-foreground mt-3">Bientôt disponible</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
