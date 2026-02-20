<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authClient } from '@/lib/auth-client';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { useRouter } from 'vue-router';
import { Loader2, Shield, ArrowLeft, Eye, EyeOff, RefreshCw, Lock } from 'lucide-vue-next';

const router = useRouter();
const formData = ref({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
});

const error = ref('');
const isLoading = ref(false);
const isSuccess = ref(false);
const showPassword = ref(false);

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  formData.value.password = pass;
}

onMounted(() => {
  generatePassword();
});

async function handleRegister() {
  error.value = '';
  isSuccess.value = false;
  
  const name = `${formData.value.firstName} ${formData.value.lastName}`.trim();

  isLoading.value = true;
  const { error: authError } = await authClient.signUp.email({
    email: formData.value.email,
    password: formData.value.password,
    name: name,
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    role: 'admin',
    callbackURL: '/',
  });

  if (authError) {
    error.value = authError.message || 'Une erreur est survenue lors de la création du compte';
  } else {
    isSuccess.value = true;
    const oldPass = formData.value.password;
    formData.value = { email: '', password: '', firstName: '', lastName: '' };
    generatePassword(); // Régénérer pour le prochain
  }

  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[500px] mx-auto shadow-xl border-slate-200">
    <CardHeader class="bg-slate-900 text-white rounded-t-lg">
      <CardTitle class="text-2xl flex items-center gap-2">
        <Shield class="h-6 w-6" />
        Nouvel Administrateur
      </CardTitle>
      <CardDescription class="text-slate-300">
        Créez un compte avec des privilèges d'administration.
      </CardDescription>
    </CardHeader>
    <CardContent class="pt-6">
      <form @submit.prevent="handleRegister" class="grid gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">Prénom</Label>
            <Input id="firstName" v-model="formData.firstName" placeholder="Jean" required />
          </div>
          <div class="space-y-2">
            <Label for="lastName">Nom</Label>
            <Input id="lastName" v-model="formData.lastName" placeholder="Dupont" required />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="email">Adresse Email</Label>
          <Input id="email" v-model="formData.email" type="email" placeholder="admin@alumni.com" required />
        </div>
        
        <div class="space-y-2">
          <Label for="password">Mot de passe</Label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="password" 
                v-model="formData.password" 
                :type="showPassword ? 'text' : 'password'" 
                class="pl-9 font-mono"
                required 
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
        
        <div v-if="error" class="p-3 rounded bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
          {{ error }}
        </div>
        
        <div v-if="isSuccess" class="p-3 rounded bg-green-100 text-green-700 text-sm font-medium border border-green-200">
          Compte administrateur créé avec succès !
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-4 pb-8">
      <Button class="w-full h-11 text-lg" :disabled="isLoading" @click="handleRegister">
        <Loader2 v-if="isLoading" class="mr-2 h-5 w-5 animate-spin" />
        {{ isLoading ? 'Création...' : 'Créer le compte Admin' }}
      </Button>
      
      <button @click="router.push('/')" class="flex items-center gap-2 text-sm text-muted-foreground hover:text-slate-900 transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Retour à l'accueil
      </button>
    </CardFooter>
  </Card>
</template>
