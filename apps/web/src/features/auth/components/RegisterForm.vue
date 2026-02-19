<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '@/lib/auth-client';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input, Label } from '@/components/ui';
import { SignUpSchema, type SignUpType } from '@alumni/shared-schema';

const formData = ref<SignUpType>({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  graduationYear: new Date().getFullYear(),
  role: 'alumni',
});

const error = ref('');
const isLoading = ref(false);

async function handleRegister() {
  error.value = '';

  const validation = SignUpSchema.safeParse(formData.value);
  if (!validation.success) {
    error.value = validation.error.issues[0].message;
    return;
  }

  isLoading.value = true;
  const { error: authError } = await authClient.signUp.email({
    email: formData.value.email,
    password: formData.value.password,
    name: `${formData.value.firstName} ${formData.value.lastName}`,
    callbackURL: '/',
  });

  if (authError) {
    error.value = authError.message || 'Une erreur est survenue lors de l\'inscription';
  }

  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[500px] mx-auto">
    <CardHeader>
      <CardTitle>Créer un compte</CardTitle>
      <CardDescription>Rejoignez la communauté des diplômés.</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleRegister" class="grid gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">Prénom</Label>
            <Input id="firstName" v-model="formData.firstName" placeholder="Alice" required />
          </div>
          <div class="space-y-2">
            <Label for="lastName">Nom</Label>
            <Input id="lastName" v-model="formData.lastName" placeholder="Dupont" required />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="formData.email" type="email" placeholder="alice.dupont@exemple.com" required />
        </div>
        <div class="space-y-2">
          <Label for="password">Mot de passe</Label>
          <Input id="password" v-model="formData.password" type="password" required />
        </div>
        <div class="space-y-2">
          <Label for="graduationYear">Année de promotion</Label>
          <Input id="graduationYear" v-model.number="formData.graduationYear" type="number" required />
        </div>
        <div v-if="error" class="text-sm text-destructive">{{ error }}</div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button class="w-full" :disabled="isLoading" @click="handleRegister">
        {{ isLoading ? 'Création…' : 'Créer mon compte' }}
      </Button>
      <div class="text-sm text-muted-foreground text-center">
        Déjà un compte ?
        <router-link to="/login" class="text-primary hover:underline">Se connecter</router-link>
      </div>
    </CardFooter>
  </Card>
</template>
