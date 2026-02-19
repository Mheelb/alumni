<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginSchema, type LoginType } from '@alumni/shared-schema';

const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

async function handleLogin() {
  error.value = '';
  
  // Basic validation
  const validation = LoginSchema.safeParse({ email: email.value, password: password.value });
  if (!validation.success) {
    error.value = validation.error.errors[0].message;
    return;
  }

  isLoading.value = true;
  const { data, error: authError } = await authClient.signIn.email({
    email: email.value,
    password: password.value,
    callbackURL: '/',
  });

  if (authError) {
    error.value = authError.message || 'An error occurred during login';
  }
  
  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[400px] mx-auto">
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription>Enter your credentials to access your account.</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="email" type="email" placeholder="john.doe@example.com" required />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input id="password" v-model="password" type="password" required />
        </div>
        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button class="w-full" :disabled="isLoading" @click="handleLogin">
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </Button>
      <div class="text-sm text-muted-foreground text-center">
        Don't have an account? 
        <router-link to="/register" class="text-primary hover:underline">Register as Alumni</router-link>
      </div>
    </CardFooter>
  </Card>
</template>
