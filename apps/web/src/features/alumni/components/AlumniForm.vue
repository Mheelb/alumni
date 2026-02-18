<script setup lang="ts">
import { ref } from 'vue';
import { AlumniSchema, type AlumniType } from '@alumni/shared-schema';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import axios from 'axios';
import { cn } from '@/lib/utils';

// Shadcn UI components
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Loader2, User, Mail, Calendar } from 'lucide-vue-next';

const queryClient = useQueryClient();
const form = ref<AlumniType>({
  firstName: '',
  lastName: '',
  email: '',
  graduationYear: new Date().getFullYear(),
});

const errors = ref<Record<string, string>>({});

const { mutate, isPending } = useMutation({
  mutationFn: async (newAlumni: AlumniType) => {
    const response = await axios.post('http://localhost:3000/alumni', newAlumni);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alumni'] });
    alert('Alumni created successfully!');
    // Reset form
    form.value = { firstName: '', lastName: '', email: '', graduationYear: new Date().getFullYear() };
  },
  onError: (error: any) => {
    alert(error.response?.data?.message || 'An error occurred');
  }
});

const submitForm = () => {
  errors.value = {};
  const result = AlumniSchema.safeParse(form.value);
  
  if (!result.success) {
    result.error.issues.forEach((issue) => {
      // @ts-ignore
      errors.value[issue.path[0]] = issue.message;
    });
    return;
  }
  
  mutate(result.data);
};
</script>

<template>
  <Card class="w-full max-w-lg mx-auto overflow-hidden shadow-lg border-slate-200">
    <CardHeader class="bg-primary text-primary-foreground space-y-1">
      <CardTitle class="text-2xl">New Alumni Profile</CardTitle>
      <CardDescription class="text-primary-foreground/80">
        Register a new graduate in the alumni network.
      </CardDescription>
    </CardHeader>

    <form @submit.prevent="submitForm">
      <CardContent class="grid gap-6 p-8">
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="firstName" :class="cn(errors.firstName && 'text-destructive')">First Name</Label>
            <div class="relative">
              <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                v-model="form.firstName"
                placeholder="John"
                class="pl-9"
                :class="cn(errors.firstName && 'border-destructive ring-destructive/20')"
              />
            </div>
            <p v-if="errors.firstName" class="text-xs font-medium text-destructive">{{ errors.firstName }}</p>
          </div>
          <div class="grid gap-2">
            <Label for="lastName" :class="cn(errors.lastName && 'text-destructive')">Last Name</Label>
            <div class="relative">
              <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="lastName"
                v-model="form.lastName"
                placeholder="Doe"
                class="pl-9"
                :class="cn(errors.lastName && 'border-destructive ring-destructive/20')"
              />
            </div>
            <p v-if="errors.lastName" class="text-xs font-medium text-destructive">{{ errors.lastName }}</p>
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="email" :class="cn(errors.email && 'text-destructive')">Email Address</Label>
          <div class="relative">
            <Mail class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              v-model="form.email"
              placeholder="john.doe@example.com"
              class="pl-9"
              :class="cn(errors.email && 'border-destructive ring-destructive/20')"
            />
          </div>
          <p v-if="errors.email" class="text-xs font-medium text-destructive">{{ errors.email }}</p>
        </div>

        <div class="grid gap-2">
          <Label for="graduationYear" :class="cn(errors.graduationYear && 'text-destructive')">Graduation Year</Label>
          <div class="relative">
            <Calendar class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="graduationYear"
              type="number"
              v-model.number="form.graduationYear"
              class="pl-9"
              :class="cn(errors.graduationYear && 'border-destructive ring-destructive/20')"
            />
          </div>
          <p v-if="errors.graduationYear" class="text-xs font-medium text-destructive">{{ errors.graduationYear }}</p>
        </div>
      </CardContent>

      <CardFooter class="bg-muted/50 p-6 flex flex-col gap-4 border-t">
        <Button 
          type="submit" 
          class="w-full" 
          size="lg"
          :disabled="isPending"
        >
          <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
          {{ isPending ? 'Creating Profile...' : 'Save Alumni' }}
        </Button>
        <p class="text-xs text-center text-muted-foreground px-4">
          By clicking save, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </form>
  </Card>
</template>
