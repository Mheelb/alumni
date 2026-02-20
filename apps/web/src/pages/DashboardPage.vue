<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { useDashboardStats } from '@/features/alumni/composables/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Bar,
  Doughnut,
  Pie,
  Line,
} from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import {
  Users,
  Briefcase,
  TrendingUp,
  UserCheck,
  Loader2,
  GraduationCap,
  Building2,
  MapPin,
  Calendar,
} from 'lucide-vue-next'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const router = useRouter()
const session = authClient.useSession()
const isAdmin = computed(() => (session.value?.data?.user as { role?: string } | undefined)?.role === 'admin')

const { data: stats, isLoading, isError } = useDashboardStats(isAdmin)

// ─── Couleurs cohérentes avec Tailwind/shadcn ───────────────────────────────
const PRIMARY = 'hsl(221.2, 83.2%, 53.3%)'
const PRIMARY_LIGHT = 'hsla(221.2, 83.2%, 53.3%, 0.15)'
const COLORS_DONUT = [
  'hsl(215, 20%, 65%)',   // unlinked - gris
  'hsl(38, 92%, 50%)',    // invited - amber
  'hsl(142, 71%, 45%)',   // registered - green
]
const COLORS_PIE = [
  PRIMARY,
  'hsl(262, 80%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)',
  'hsl(186, 80%, 45%)',
  'hsl(316, 70%, 55%)',
]

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
}

// ─── Diplômés par an ────────────────────────────────────────────────────────
const graduationChartData = computed(() => ({
  labels: stats.value?.byGraduationYear.map(d => String(d.year)) ?? [],
  datasets: [{
    label: 'Diplômés',
    data: stats.value?.byGraduationYear.map(d => d.count) ?? [],
    backgroundColor: PRIMARY,
    borderRadius: 6,
  }],
}))

const graduationChartOptions = {
  ...baseChartOptions,
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
    x: { grid: { display: false } },
  },
}

// ─── Statut des comptes ─────────────────────────────────────────────────────
const statusChartData = computed(() => ({
  labels: ['Non liés', 'Invités', 'Inscrits'],
  datasets: [{
    data: stats.value
      ? [stats.value.byStatus.unlinked, stats.value.byStatus.invited, stats.value.byStatus.registered]
      : [],
    backgroundColor: COLORS_DONUT,
    borderWidth: 0,
    hoverOffset: 6,
  }],
}))

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' as const },
    tooltip: { mode: 'index' as const, intersect: true },
  },
  cutout: '65%',
}

// ─── Top villes ─────────────────────────────────────────────────────────────
const cityChartData = computed(() => ({
  labels: stats.value?.byCity.map(d => d.city) ?? [],
  datasets: [{
    label: 'Alumni',
    data: stats.value?.byCity.map(d => d.count) ?? [],
    backgroundColor: PRIMARY,
    borderRadius: 4,
  }],
}))

const horizontalBarOptions = {
  ...baseChartOptions,
  indexAxis: 'y' as const,
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 } },
    y: { grid: { display: false } },
  },
}

// ─── Top entreprises ────────────────────────────────────────────────────────
const companyChartData = computed(() => ({
  labels: stats.value?.byCompany.map(d => d.company) ?? [],
  datasets: [{
    label: 'Alumni',
    data: stats.value?.byCompany.map(d => d.count) ?? [],
    backgroundColor: 'hsl(262, 80%, 58%)',
    borderRadius: 4,
  }],
}))

// ─── Distribution diplômes ───────────────────────────────────────────────────
const diplomaChartData = computed(() => ({
  labels: stats.value?.byDiploma.map(d => d.diploma) ?? [],
  datasets: [{
    data: stats.value?.byDiploma.map(d => d.count) ?? [],
    backgroundColor: COLORS_PIE,
    borderWidth: 0,
    hoverOffset: 6,
  }],
}))

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom' as const },
  },
}

// ─── Évolution des inscriptions ──────────────────────────────────────────────
const inscriptionChartData = computed(() => ({
  labels: stats.value?.byCreatedYear.map(d => String(d.year)) ?? [],
  datasets: [{
    label: 'Nouveaux alumni',
    data: stats.value?.byCreatedYear.map(d => d.count) ?? [],
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
    fill: true,
    tension: 0.4,
    pointBackgroundColor: PRIMARY,
    pointRadius: 4,
  }],
}))

const lineOptions = {
  ...baseChartOptions,
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
    x: { grid: { display: false } },
  },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// KPI cards definition
const kpis = computed(() => [
  {
    label: 'Alumni actifs',
    value: stats.value?.total ?? '—',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    suffix: '',
  },
  {
    label: 'Taux d\'activation',
    value: stats.value ? `${stats.value.activationRate}` : '—',
    icon: UserCheck,
    color: 'text-green-600',
    bg: 'bg-green-50',
    suffix: '%',
  },
  {
    label: 'Taux d\'emploi',
    value: stats.value ? `${stats.value.employmentRate}` : '—',
    icon: Briefcase,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    suffix: '%',
  },
  {
    label: 'Taux de freelance',
    value: stats.value ? `${stats.value.freelanceRate}` : '—',
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    suffix: '%',
  },
])
</script>

<template>
  <div class="container py-8 space-y-8 max-w-7xl">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      <p class="text-muted-foreground text-sm mt-1">Vue d'ensemble analytique des alumni My Digital School.</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-32">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="text-center py-20 text-destructive">
      Impossible de charger les statistiques.
    </div>

    <template v-else-if="stats">
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card v-for="kpi in kpis" :key="kpi.label">
          <CardContent class="p-5">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">{{ kpi.label }}</p>
                <p class="text-3xl font-bold text-slate-900">{{ kpi.value }}<span class="text-lg font-semibold text-muted-foreground">{{ kpi.suffix }}</span></p>
              </div>
              <div :class="['p-2 rounded-lg', kpi.bg]">
                <component :is="kpi.icon" :class="['h-5 w-5', kpi.color]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Ligne 1 : Diplômés par an + Statut des comptes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <GraduationCap class="h-4 w-4 text-primary" />
              Diplômés par année de promotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="stats.byGraduationYear.length" class="h-64">
              <Bar :data="graduationChartData" :options="graduationChartOptions" />
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-10">Aucune donnée de promotion disponible.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <UserCheck class="h-4 w-4 text-primary" />
              Statut des comptes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="h-64">
              <Doughnut :data="statusChartData" :options="donutOptions" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Ligne 2 : Top villes + Distribution diplômes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <MapPin class="h-4 w-4 text-primary" />
              Top 10 villes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="stats.byCity.length" class="h-72">
              <Bar :data="cityChartData" :options="horizontalBarOptions" />
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-10">Aucune donnée de ville disponible.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <GraduationCap class="h-4 w-4 text-primary" />
              Distribution par diplôme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="stats.byDiploma.length" class="h-72">
              <Pie :data="diplomaChartData" :options="pieOptions" />
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-10">Aucune donnée de diplôme disponible.</p>
          </CardContent>
        </Card>
      </div>

      <!-- Ligne 3 : Top entreprises + Évolution inscriptions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <Building2 class="h-4 w-4 text-primary" />
              Top 10 entreprises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="stats.byCompany.length" class="h-72">
              <Bar :data="companyChartData" :options="horizontalBarOptions" />
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-10">Aucune donnée d'entreprise disponible.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-base flex items-center gap-2">
              <Calendar class="h-4 w-4 text-primary" />
              Évolution des inscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="stats.byCreatedYear.length" class="h-72">
              <Line :data="inscriptionChartData" :options="lineOptions" />
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-10">Aucune donnée d'inscription disponible.</p>
          </CardContent>
        </Card>
      </div>

      <!-- Alumni récents -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base flex items-center gap-2">
            <Users class="h-4 w-4 text-primary" />
            Alumni récemment ajoutés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="divide-y">
            <div
              v-for="alumni in stats.recentAlumni"
              :key="alumni._id"
              class="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/40 px-2 rounded-md transition-colors"
              @click="router.push('/annuaire/' + alumni._id)"
            >
              <div class="space-y-0.5">
                <p class="text-sm font-medium">{{ alumni.firstName }} {{ alumni.lastName }}</p>
                <p class="text-xs text-muted-foreground">{{ alumni.email }}</p>
              </div>
              <div class="flex items-center gap-3">
                <AlumniStatusBadge :status="alumni.status" />
                <span class="text-xs text-muted-foreground hidden sm:block">{{ formatDate(alumni.createdAt) }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
