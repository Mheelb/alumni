<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '@/lib/auth-client'
import { useAlumniDetail } from '@/features/alumni/composables/useAlumni'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui'
import {
  User,
  Mail,
  ShieldCheck,
  GraduationCap,
  Calendar,
  Lock,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  Eye,
} from 'lucide-vue-next'

const router = useRouter()
const session = authClient.useSession()

// Alumni details if applicable
const alumniId = computed(() => session.value?.data?.user?.alumniId)
const { data: alumni, isLoading: isLoadingAlumni } = useAlumniDetail(ref(alumniId.value || ''))

// Password change state
const passwordDialogOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isChangingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

async function handleChangePassword() {
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "Les mots de passe ne correspondent pas."
    return
  }

  isChangingPassword.value = true
  passwordError.value = ''
  
  const { error } = await authClient.changePassword({
    currentPassword: currentPassword.value,
    newPassword: newPassword.value,
    revokeOtherSessions: true,
  })

  if (error) {
    passwordError.value = error.message || "Une erreur est survenue."
  } else {
    passwordSuccess.value = true
    setTimeout(() => {
      passwordDialogOpen.value = false
      passwordSuccess.value = false
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    }, 2000)
  }
  isChangingPassword.value = false
}

// Account deletion state
const deleteDialogOpen = ref(false)
const isDeletingAccount = ref(false)

async function handleDeleteAccount() {
  isDeletingAccount.value = true
  const { error } = await authClient.deleteUser()
  
  if (error) {
    alert(error.message || "Impossible de supprimer le compte.")
    isDeletingAccount.value = false
  } else {
    router.push('/login')
  }
}

function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

function formatDate(d: string | Date | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="container py-8 space-y-8 max-w-5xl">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Mon Compte</h1>
        <p class="text-muted-foreground text-sm mt-1">
          Gérez vos informations personnelles et les paramètres de votre compte.
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="session.isPending" class="flex items-center justify-center py-20">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <template v-else-if="session.data?.user">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sidebar: Profile Overview -->
        <div class="lg:col-span-1 space-y-6">
          <Card>
            <CardContent class="p-6">
              <div class="flex flex-col items-center text-center space-y-4">
                <Avatar class="h-24 w-24 text-2xl border-2 border-muted">
                  <AvatarFallback class="text-3xl font-semibold bg-primary/5 text-primary">
                    {{ getInitials(session.data.user.name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="space-y-1">
                  <h2 class="text-xl font-bold">{{ session.data.user.name }}</h2>
                  <div class="flex items-center justify-center gap-2">
                    <Badge :variant="session.data.user.role === 'admin' ? 'default' : 'secondary'" class="capitalize font-normal px-2.5">
                      <ShieldCheck v-if="session.data.user.role === 'admin'" class="h-3.5 w-3.5 mr-1.5" />
                      <User v-else class="h-3.5 w-3.5 mr-1.5" />
                      {{ session.data.user.role }}
                    </Badge>
                  </div>
                  <p class="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <Mail class="h-3.5 w-3.5" />
                    {{ session.data.user.email }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Main Content: Details -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Informations personnelles -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg flex items-center gap-2">
                <User class="h-5 w-5 text-primary" />
                Informations du compte
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-1">
                  <Label class="text-xs text-muted-foreground uppercase tracking-wider">Prénom</Label>
                  <p class="text-sm font-medium p-2 rounded-md bg-muted/30 border border-transparent">
                    {{ session.data.user.firstName || '—' }}
                  </p>
                </div>
                <div class="space-y-1">
                  <Label class="text-xs text-muted-foreground uppercase tracking-wider">Nom</Label>
                  <p class="text-sm font-medium p-2 rounded-md bg-muted/30 border border-transparent">
                    {{ session.data.user.lastName || '—' }}
                  </p>
                </div>
              </div>
              <div class="space-y-1">
                <Label class="text-xs text-muted-foreground uppercase tracking-wider">Adresse Email</Label>
                <div class="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-transparent">
                  <Mail class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm font-medium">{{ session.data.user.email }}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Formation / Alumni (si applicable) -->
          <Card v-if="alumni || isLoadingAlumni">
            <CardHeader>
              <CardTitle class="text-lg flex items-center gap-2">
                <GraduationCap class="h-5 w-5 text-primary" />
                Profil Alumni Lié
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="isLoadingAlumni" class="flex justify-center py-6">
                <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
              <div v-else-if="alumni" class="grid gap-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div class="space-y-1">
                    <Label class="text-xs text-muted-foreground uppercase tracking-wider">Promotion</Label>
                    <div class="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-primary font-semibold border border-transparent">
                      <Calendar class="h-4 w-4" />
                      <span class="text-sm">{{ alumni.graduationYear ?? '—' }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <Label class="text-xs text-muted-foreground uppercase tracking-wider">Diplôme</Label>
                    <p class="text-sm font-medium p-2 rounded-md bg-muted/30 border border-transparent">
                      {{ alumni.diploma ?? '—' }}
                    </p>
                  </div>
                </div>
                
                <div class="pt-2 flex justify-end">
                  <Button variant="outline" size="sm" class="gap-2" @click="router.push('/annuaire/' + alumni._id)">
                    <Eye class="h-4 w-4" />
                    Voir mon profil public
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Gestion du compte -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg flex items-center gap-2">
                <Lock class="h-5 w-5 text-muted-foreground" />
                Gestion du compte
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <p class="text-sm font-medium">Sécurité</p>
                  <p class="text-sm text-muted-foreground">
                    Modifiez votre mot de passe pour sécuriser votre accès.
                  </p>
                </div>
                <Button variant="outline" size="sm" class="gap-2 shrink-0" @click="passwordDialogOpen = true">
                  <Lock class="h-4 w-4" />
                  Changer le mot de passe
                </Button>
              </div>
              
              <Separator />

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <p class="text-sm font-medium">Fermeture du compte</p>
                  <p class="text-sm text-muted-foreground">
                    Supprimez définitivement votre compte et vos données d'accès.
                  </p>
                </div>
                <Button variant="outline" size="sm" class="gap-2 shrink-0 text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20" @click="deleteDialogOpen = true">
                  <Trash2 class="h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-20 gap-4">
      <p class="text-muted-foreground">Impossible de charger les informations de session.</p>
      <Button variant="outline" @click="router.push('/login')">Retour à la connexion</Button>
    </div>
  </div>

  <!-- Change Password Dialog -->
  <Dialog :open="passwordDialogOpen" @update:open="passwordDialogOpen = $event">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Changer le mot de passe</DialogTitle>
        <DialogDescription>
          Saisissez votre mot de passe actuel et votre nouveau mot de passe.
        </DialogDescription>
      </DialogHeader>
      
      <div v-if="passwordSuccess" class="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
        <CheckCircle2 class="h-4 w-4" />
        Mot de passe mis à jour avec succès !
      </div>

      <form v-else @submit.prevent="handleChangePassword" class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="currentPassword">Mot de passe actuel</Label>
          <Input id="currentPassword" v-model="currentPassword" type="password" required />
        </div>
        <div class="space-y-2">
          <Label for="newPassword">Nouveau mot de passe</Label>
          <Input id="newPassword" v-model="newPassword" type="password" required />
        </div>
        <div class="space-y-2">
          <Label for="confirmPassword">Confirmer le nouveau mot de passe</Label>
          <Input id="confirmPassword" v-model="confirmPassword" type="password" required />
        </div>
        <p v-if="passwordError" class="text-sm text-destructive font-medium">{{ passwordError }}</p>
      </form>

      <DialogFooter>
        <Button variant="outline" @click="passwordDialogOpen = false">Annuler</Button>
        <Button 
          v-if="!passwordSuccess"
          type="submit" 
          @click="handleChangePassword"
          :disabled="isChangingPassword"
        >
          <Loader2 v-if="isChangingPassword" class="mr-2 h-4 w-4 animate-spin" />
          Mettre à jour
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Account Confirmation -->
  <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle class="text-destructive flex items-center gap-2">
          <AlertCircle class="h-5 w-5" />
          Supprimer mon compte
        </DialogTitle>
        <DialogDescription>
          Cette action est irréversible. Votre compte utilisateur sera définitivement supprimé.
          Votre profil alumni restera dans la base de données mais ne sera plus lié à un compte.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="mt-4">
        <Button variant="outline" @click="deleteDialogOpen = false">Annuler</Button>
        <Button 
          variant="destructive" 
          @click="handleDeleteAccount"
          :disabled="isDeletingAccount"
        >
          <Loader2 v-if="isDeletingAccount" class="mr-2 h-4 w-4 animate-spin" />
          Confirmer la suppression
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
