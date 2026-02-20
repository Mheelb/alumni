<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authClient } from '@/lib/auth-client';
import axios from 'axios';
import { 
  Button, 
  Input, 
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from '@/components/ui';
import { cn } from '@/lib/utils'
import { Loader2, Shield, Eye, EyeOff, RefreshCw, Lock, UserPlus, Mail } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean
}>();

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

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
  
  isLoading.value = true;
  try {
    const response = await axios.post('http://localhost:3000/admin/users', {
      email: formData.value.email,
      password: formData.value.password,
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      name: `${formData.value.firstName} ${formData.value.lastName}`.trim(),
    }, {
      withCredentials: true
    });

    if (response.data.status === 'success') {
      isSuccess.value = true;
      formData.value = { email: '', password: '', firstName: '', lastName: '' };
      generatePassword();
      setTimeout(() => {
        emit('update:open', false);
        emit('success');
        isSuccess.value = false;
      }, 1500);
    } else {
      error.value = response.data.message || 'Une erreur est survenue';
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Une erreur technique est survenue';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-2xl p-0 flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-6">
        <SheetHeader class="mb-8">
          <SheetTitle class="flex items-center gap-2 text-2xl">
            <Shield class="h-6 w-6 text-primary" />
            Nouveau compte administrateur
          </SheetTitle>
          <SheetDescription class="text-base">
            Créez manuellement un nouvel accès avec privilèges d'administration.
          </SheetDescription>
        </SheetHeader>

        <form id="admin-register-form" class="space-y-8" @submit.prevent="handleRegister">
          <!-- Erreur globale -->
          <p v-if="error" class="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
            {{ error }}
          </p>

          <!-- Succès -->
          <div v-if="isSuccess" class="p-3 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 flex items-center gap-2">
            <Loader2 class="h-4 w-4 animate-spin" />
            Compte créé ! Fermeture...
          </div>

          <!-- Section Identité -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identité</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  v-model="formData.firstName"
                  placeholder="Jean"
                  required
                  :disabled="isLoading"
                />
              </div>
              <div class="space-y-2">
                <Label for="lastName">Nom</Label>
                <Input
                  id="lastName"
                  v-model="formData.lastName"
                  placeholder="Dupont"
                  required
                  :disabled="isLoading"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="email">Email</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  v-model="formData.email"
                  placeholder="admin@alumni.com"
                  class="pl-9"
                  required
                  :disabled="isLoading"
                />
              </div>
            </div>
          </div>

          <!-- Section Sécurité -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sécurité</h3>
            <div class="space-y-2">
              <Label for="password">Mot de passe généré</Label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <Lock class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    v-model="formData.password" 
                    :type="showPassword ? 'text' : 'password'" 
                    class="pl-9 font-mono text-sm"
                    required 
                    :disabled="isLoading"
                  />
                  <button 
                    type="button" 
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Eye v-if="!showPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" @click="generatePassword" title="Régénérer" :disabled="isLoading">
                  <RefreshCw class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                Notez bien ce mot de passe ou transmettez-le au futur administrateur.
              </p>
            </div>
          </div>
        </form>
      </div>

      <SheetFooter class="p-6 border-t bg-muted/20 gap-2 sm:gap-0">
        <SheetClose as-child>
          <Button type="button" variant="outline" :disabled="isLoading">Annuler</Button>
        </SheetClose>
        <Button type="submit" form="admin-register-form" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          <UserPlus v-else class="mr-2 h-4 w-4" />
          Créer l'administrateur
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
