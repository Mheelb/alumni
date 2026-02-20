<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '@/lib/auth-client';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { LoginSchema } from '@alumni/shared-schema';
import { Eye, EyeOff } from 'lucide-vue-next';

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const error = ref('');
const isLoading = ref(false);

async function handleLogin() {
  error.value = '';

  const validation = LoginSchema.safeParse({ email: email.value, password: password.value });
  if (!validation.success) {
    error.value = validation.error.issues[0].message;
    return;
  }

  isLoading.value = true;
  const { error: authError } = await authClient.signIn.email({
    email: email.value,
    password: password.value,
    callbackURL: '/',
  });

  if (authError) {
    error.value = authError.message || 'Une erreur est survenue lors de la connexion';
  }

  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[400px] mx-auto">
    <CardHeader>
      <CardTitle>Connexion</CardTitle>
      <CardDescription>Entrez vos identifiants pour accéder à votre compte.</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" placeholder="john.doe@exemple.com" required />
        </div>
        <div class="space-y-2">
          <Label for="password">Mot de passe</Label>
          <div class="relative">
            <Input 
              id="password" 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              required 
              class="pr-10"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="!showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div v-if="error" class="text-sm text-destructive">{{ error }}</div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button class="w-full" :disabled="isLoading" @click="handleLogin">
        {{ isLoading ? 'Connexion…' : 'Se connecter' }}
      </Button>
    </CardFooter>
  </Card>
</template>
