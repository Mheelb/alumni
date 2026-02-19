<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '@/lib/auth-client';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { LoginSchema } from '@alumni/shared-schema';

const email = ref('');
const password = ref('');
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
          <Input id="password" v-model="password" type="password" required />
        </div>
        <div v-if="error" class="text-sm text-destructive">{{ error }}</div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button class="w-full" :disabled="isLoading" @click="handleLogin">
        {{ isLoading ? 'Connexion…' : 'Se connecter' }}
      </Button>
      <div class="text-sm text-muted-foreground text-center">
        Pas encore de compte ?
        <router-link to="/register" class="text-primary hover:underline">S'inscrire</router-link>
      </div>
    </CardFooter>
  </Card>
</template>
