<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authClient } from '@/lib/auth-client';
import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  Input, 
  Label 
} from '@/components/ui';
import { Loader2, ShieldCheck, User, Mail, Lock, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-vue-next';
import { type AlumniType } from '@alumni/shared-schema';

const route = useRoute();
const router = useRouter();
const alumniId = route.params.alumniId as string;

const password = ref('');
const error = ref('');
const isLoading = ref(false);
const isSuccess = ref(false);
const showPassword = ref(false);

// Fetch alumni details
const { data: alumni, isLoading: isFetchingAlumni } = useQuery({
  queryKey: ['alumni', alumniId],
  queryFn: async () => {
    // Mode Test : Retourne des données fictives si l'ID est 'test'
    if (alumniId === 'test') {
      return {
        firstName: 'Jean',
        lastName: 'Test',
        email: 'jean.test@example.com',
        graduationYear: 2024
      } as AlumniType;
    }
    const response = await axios.get(`http://localhost:3000/alumni/${alumniId}`);
    return response.data as AlumniType;
  },
  enabled: !!alumniId,
  retry: alumniId === 'test' ? false : 3,
});

// Check if user account already exists
const { data: userAccountStatus, isLoading: isCheckingUser } = useQuery({
  queryKey: ['user-exists', alumni.value?.email],
  queryFn: async () => {
    if (!alumni.value?.email) return { exists: false };
    const response = await axios.get(`http://localhost:3000/users/check-email/${alumni.value.email}`);
    return response.data as { exists: boolean };
  },
  enabled: computed(() => !!alumni.value?.email),
});

const userExists = computed(() => userAccountStatus.value?.exists || false);

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password.value = pass;
}

onMounted(() => {
  generatePassword();
});

async function handleCreateAccount() {
  if (!alumni.value || userExists.value) return;
  
  error.value = '';
  isLoading.value = true;
  
  const { data, error: authError } = await authClient.signUp.email({
    email: alumni.value.email,
    password: password.value,
    name: `${alumni.value.firstName} ${alumni.value.lastName}`,
    firstName: alumni.value.firstName,
    lastName: alumni.value.lastName,
    role: 'alumni',
    graduationYear: alumni.value.graduationYear,
  });

  if (authError) {
    error.value = authError.message || 'Une erreur est survenue lors de la création du compte';
  } else {
    isSuccess.value = true;
  }
  
  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[500px] mx-auto shadow-xl border-slate-200">
    <CardHeader class="bg-primary text-primary-foreground rounded-t-lg">
      <CardTitle class="text-2xl flex items-center gap-2">
        <ShieldCheck class="h-6 w-6" />
        Création de Compte
      </CardTitle>
      <CardDescription class="text-primary-foreground/90">
        Générez un accès sécurisé pour cet alumni.
      </CardDescription>
    </CardHeader>
    
    <CardContent class="pt-6 space-y-6">
      <div v-if="isFetchingAlumni || isCheckingUser" class="flex justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
      </div>

      <template v-else-if="alumni">
        <!-- Alumni Info Box -->
        <div class="bg-muted p-4 rounded-lg border border-slate-200 space-y-2">
          <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User class="h-4 w-4" />
            Profil Alumni
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">Nom complet:</div>
            <div class="font-medium">{{ alumni.firstName }} {{ alumni.lastName }}</div>
            <div class="text-muted-foreground">Année:</div>
            <div class="font-medium">{{ alumni.graduationYear }}</div>
          </div>
        </div>

        <!-- Warning if account exists -->
        <div v-if="userExists" class="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
          <AlertCircle class="h-5 w-5 shrink-0" />
          <div>
            <p class="font-bold">Compte déjà existant</p>
            <p>Un utilisateur est déjà enregistré avec l'adresse email <strong>{{ alumni.email }}</strong>.</p>
          </div>
        </div>

        <form v-else @submit.prevent="handleCreateAccount" class="space-y-4">
          <div class="space-y-2">
            <Label for="email">Adresse Email</Label>
            <div class="relative">
              <Mail class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" :model-value="alumni.email" readonly class="pl-9 bg-slate-50" />
            </div>
            <p class="text-[10px] text-muted-foreground italic">L'email est récupéré du profil et ne peut pas être modifié ici.</p>
          </div>

          <div class="space-y-2">
            <Label for="password">Mot de passe sécurisé</Label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  class="pl-9 font-mono" 
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-3 text-muted-foreground hover:text-slate-900"
                >
                  <Eye v-if="!showPassword" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
              <Button type="button" variant="outline" size="icon" @click="generatePassword" title="Régénérer">
                <RefreshCw class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div v-if="error" class="bg-destructive/10 p-3 rounded text-sm text-destructive font-medium">
            {{ error }}
          </div>

          <div v-if="isSuccess" class="bg-green-100 p-3 rounded text-sm text-green-700 font-medium border border-green-200">
            Compte créé avec succès ! L'utilisateur peut maintenant se connecter.
          </div>
        </form>
      </template>

      <div v-else class="text-center py-8 text-destructive">
        Impossible de trouver les informations de l'alumni.
      </div>
    </CardContent>

    <CardFooter class="flex flex-col gap-3 pb-8">
      <Button 
        class="w-full h-12 text-lg" 
        :disabled="isLoading || isFetchingAlumni || isCheckingUser || isSuccess || !alumni || userExists" 
        @click="handleCreateAccount"
      >
        <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
        {{ isLoading ? 'Création en cours...' : 'Créer le compte' }}
      </Button>
      <Button variant="ghost" class="w-full" @click="router.back()">
        Retour
      </Button>
    </CardFooter>
  </Card>
</template>
