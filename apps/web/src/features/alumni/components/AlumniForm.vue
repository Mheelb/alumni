<script setup lang="ts">
import { ref } from 'vue';
import { AlumniProfileSchema, type AlumniProfileType } from '@alumni/shared-schema';
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
import { Loader2, User, Mail, Calendar, Linkedin, Briefcase, MapPin, Download } from 'lucide-vue-next';

const queryClient = useQueryClient();
type AlumniFormData = {
  firstName?: string; lastName?: string; email?: string
  graduationYear?: number; diploma?: string; city?: string
  company?: string; jobTitle?: string; phone?: string
  linkedinUrl?: string; avatarUrl?: string
  status?: 'unlinked' | 'invited' | 'registered'; isActive?: boolean
}

// Use the full profile type
const form = ref<AlumniFormData>({
  firstName: '',
  lastName: '',
  email: '',
  graduationYear: new Date().getFullYear(),
  linkedinUrl: '',
  company: '',
  jobTitle: '',
  city: '',
  avatarUrl: '',
});

const errors = ref<Record<string, string>>({});
const importUrl = ref('');
const isImporting = ref(false);

const { mutate, isPending } = useMutation({
  mutationFn: async (newAlumni: AlumniProfileType) => {
    const response = await axios.post('http://localhost:3000/alumni', newAlumni);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['alumni'] });
    alert('Alumni created successfully!');
    // Reset form
    form.value = { 
      firstName: '', 
      lastName: '', 
      email: '', 
      graduationYear: new Date().getFullYear(),
      linkedinUrl: '',
      company: '', 
      jobTitle: '', 
      city: '',
      avatarUrl: ''
    };
    importUrl.value = '';
  },
  onError: (error: any) => {
    alert(error.response?.data?.message || 'An error occurred');
  }
});

const importFromLinkedIn = async () => {
  if (!importUrl.value) return;
  
  isImporting.value = true;
  try {
    const { data } = await axios.post('http://localhost:3000/scraper/extract', {
      url: importUrl.value
    }, {
      withCredentials: true // Important for session cookie
    });
    
    const scraped = data.data;
    
    // Auto-fill fields if they are empty or update them
    if (scraped.firstName) form.value.firstName = scraped.firstName;
    if (scraped.lastName) form.value.lastName = scraped.lastName;
    if (scraped.company) form.value.company = scraped.company;
    if (scraped.jobTitle) form.value.jobTitle = scraped.jobTitle;
    if (scraped.city) form.value.city = scraped.city;
    if (scraped.avatarUrl) form.value.avatarUrl = scraped.avatarUrl;
    
    // Also set the LinkedIn URL field
    form.value.linkedinUrl = importUrl.value;
    
    alert('Profil importé avec succès ! Veuillez vérifier les informations.');
  } catch (err) {
    console.error(err);
    alert('Erreur lors de l\'import LinkedIn. Vérifiez l\'URL ou essayez manuellement.');
  } finally {
    isImporting.value = false;
  }
};

const submitForm = () => {
  errors.value = {};
  // Validate with the full schema
  const result = AlumniProfileSchema.safeParse(form.value);
  
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
        Register a new graduate manually or import from LinkedIn.
      </CardDescription>
    </CardHeader>

    <div class="p-6 bg-muted/30 border-b">
      <Label class="text-sm font-medium mb-2 block">Import from LinkedIn</Label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Linkedin class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            v-model="importUrl" 
            placeholder="https://linkedin.com/in/username" 
            class="pl-9 bg-background"
          />
        </div>
        <Button 
          type="button" 
          variant="secondary" 
          @click="importFromLinkedIn"
          :disabled="isImporting || !importUrl"
        >
          <Loader2 v-if="isImporting" class="mr-2 h-4 w-4 animate-spin" />
          <Download v-else class="mr-2 h-4 w-4" />
          Import
        </Button>
      </div>
      <p class="text-xs text-muted-foreground mt-2">
        Enter a public profile URL to auto-fill details.
      </p>
    </div>

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
          <Label for="linkedinUrl" :class="cn(errors.linkedinUrl && 'text-destructive')">LinkedIn Profile URL</Label>
          <div class="relative">
            <Linkedin class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="linkedinUrl"
              v-model="form.linkedinUrl"
              placeholder="https://linkedin.com/in/..."
              class="pl-9"
              :class="cn(errors.linkedinUrl && 'border-destructive ring-destructive/20')"
            />
          </div>
          <p v-if="errors.linkedinUrl" class="text-xs font-medium text-destructive">{{ errors.linkedinUrl }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
           <div class="grid gap-2">
            <Label for="company">Company</Label>
            <div class="relative">
              <Briefcase class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="company"
                v-model="form.company"
                placeholder="Acme Inc."
                class="pl-9"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label for="jobTitle">Job Title</Label>
            <div class="relative">
              <Briefcase class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="jobTitle"
                v-model="form.jobTitle"
                placeholder="Software Engineer"
                class="pl-9"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
           <div class="grid gap-2">
            <Label for="city">City</Label>
            <div class="relative">
              <MapPin class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="city"
                v-model="form.city"
                placeholder="Paris"
                class="pl-9"
              />
            </div>
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
        </div>

        <!-- Hidden Avatar Field (handled automatically) -->
        <input type="hidden" v-model="form.avatarUrl" />

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
