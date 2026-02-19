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
  
  // Basic validation
  const validation = SignUpSchema.safeParse(formData.value);
  if (!validation.success) {
    error.value = validation.error.errors[0].message;
    return;
  }

  isLoading.value = true;
  const { data, error: authError } = await authClient.signUp.email({
    email: formData.value.email,
    password: formData.value.password,
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    role: formData.value.role,
    graduationYear: formData.value.graduationYear,
    callbackURL: '/',
  });

  if (authError) {
    error.value = authError.message || 'An error occurred during registration';
  }
  
  isLoading.value = false;
}
</script>

<template>
  <Card class="w-[500px] mx-auto">
    <CardHeader>
      <CardTitle>Register as Alumni</CardTitle>
      <CardDescription>Create your account to stay connected with the community.</CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleRegister" class="grid gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">First Name</Label>
            <Input id="firstName" v-model="formData.firstName" placeholder="John" required />
          </div>
          <div class="space-y-2">
            <Label for="lastName">Last Name</Label>
            <Input id="lastName" v-model="formData.lastName" placeholder="Doe" required />
          </div>
        </div>
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="formData.email" type="email" placeholder="john.doe@example.com" required />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input id="password" v-model="formData.password" type="password" required />
        </div>
        <div class="space-y-2">
          <Label for="graduationYear">Graduation Year</Label>
          <Input id="graduationYear" v-model.number="formData.graduationYear" type="number" required />
        </div>
        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>
      </form>
    </CardContent>
    <CardFooter class="flex flex-col gap-2">
      <Button class="w-full" :disabled="isLoading" @click="handleRegister">
        {{ isLoading ? 'Creating account...' : 'Register' }}
      </Button>
      <div class="text-sm text-muted-foreground text-center">
        Already have an account? 
        <router-link to="/login" class="text-primary hover:underline">Login</router-link>
      </div>
    </CardFooter>
  </Card>
</template>
