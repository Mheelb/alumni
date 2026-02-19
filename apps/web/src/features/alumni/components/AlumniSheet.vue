<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlumniProfileSchema, type AlumniProfileType, type AlumniUpdateType } from '@alumni/shared-schema'
import type { AlumniDetail } from '../composables/useAlumni'
import { useCreateAlumni, useUpdateAlumni } from '../composables/useAlumni'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { Loader2, Linkedin, Download } from 'lucide-vue-next'
import axios from 'axios'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  alumni?: AlumniDetail
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const currentYear = new Date().getFullYear()

const emptyForm = (): Partial<AlumniProfileType> => ({
  firstName: '',
  lastName: '',
  email: '',
  graduationYear: undefined,
  diploma: '',
  city: '',
  company: '',
  jobTitle: '',
  phone: '',
  linkedinUrl: '',
})

const form = ref<Partial<AlumniProfileType>>(emptyForm())
const errors = ref<Record<string, string>>({})
const importUrl = ref('')
const isImporting = ref(false)

async function importFromLinkedIn() {
  if (!importUrl.value) return
  
  isImporting.value = true
  errors.value = {}
  
  try {
    const { data } = await axios.post('http://localhost:3000/scraper/extract', {
      url: importUrl.value
    }, {
      withCredentials: true
    })
    
    const scraped = data.data
    
    // Auto-fill fields
    if (scraped.firstName) form.value.firstName = scraped.firstName
    if (scraped.lastName) form.value.lastName = scraped.lastName
    if (scraped.company) form.value.company = scraped.company
    if (scraped.jobTitle) form.value.jobTitle = scraped.jobTitle
    if (scraped.city) form.value.city = scraped.city
    
    // Set LinkedIn URL
    form.value.linkedinUrl = importUrl.value
    
    // Clear import field
    importUrl.value = ''
    
  } catch (err: any) {
    console.error(err)
    errors.value._global = 'Erreur lors de l\'import LinkedIn. Vérifiez l\'URL.'
  } finally {
    isImporting.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errors.value = {}
    importUrl.value = ''
    if (props.mode === 'edit' && props.alumni) {
      form.value = {
        firstName: props.alumni.firstName,
        lastName: props.alumni.lastName,
        email: props.alumni.email,
        graduationYear: props.alumni.graduationYear,
        diploma: props.alumni.diploma ?? '',
        city: props.alumni.city ?? '',
        company: props.alumni.company ?? '',
        jobTitle: props.alumni.jobTitle ?? '',
        phone: props.alumni.phone ?? '',
        linkedinUrl: props.alumni.linkedinUrl ?? '',
      }
    } else {
      form.value = emptyForm()
    }
  },
  { immediate: true },
)

const createMutation = useCreateAlumni()
const updateMutation = useUpdateAlumni()

const isPending = ref(false)

function validate(): boolean {
  errors.value = {}

  if (props.mode === 'create') {
    const result = AlumniProfileSchema.safeParse({
      ...form.value,
      status: 'invited',
      isActive: true,
      graduationYear: form.value.graduationYear || undefined,
      linkedinUrl: form.value.linkedinUrl || undefined,
    })
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0])
        if (!errors.value[key]) errors.value[key] = issue.message
      })
      return false
    }
  } else {
    if (!form.value.firstName || form.value.firstName.length < 2)
      errors.value.firstName = 'Le prénom doit contenir au moins 2 caractères'
    if (!form.value.lastName || form.value.lastName.length < 2)
      errors.value.lastName = 'Le nom doit contenir au moins 2 caractères'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return

  isPending.value = true
  try {
    if (props.mode === 'create') {
      await createMutation.mutateAsync({
        firstName: form.value.firstName!,
        lastName: form.value.lastName!,
        email: form.value.email!,
        graduationYear: form.value.graduationYear || undefined,
        diploma: form.value.diploma || undefined,
        city: form.value.city || undefined,
        company: form.value.company || undefined,
        jobTitle: form.value.jobTitle || undefined,
        phone: form.value.phone || undefined,
        linkedinUrl: form.value.linkedinUrl || undefined,
        status: 'invited',
        isActive: true,
      })
    } else if (props.alumni) {
      const updateBody: AlumniUpdateType = {
        firstName: form.value.firstName,
        lastName: form.value.lastName,
        graduationYear: form.value.graduationYear || undefined,
        diploma: form.value.diploma || undefined,
        city: form.value.city || undefined,
        company: form.value.company || undefined,
        jobTitle: form.value.jobTitle || undefined,
        phone: form.value.phone || undefined,
        linkedinUrl: form.value.linkedinUrl || undefined,
      }
      await updateMutation.mutateAsync({ id: props.alumni._id, body: updateBody })
    }
    emit('update:open', false)
    emit('success')
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } } }
    const msg = axiosErr.response?.data?.message ?? 'Une erreur est survenue'
    errors.value._global = msg
  } finally {
    isPending.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-2xl overflow-y-auto">
      <SheetHeader class="mb-6">
        <SheetTitle>
          {{ mode === 'create' ? 'Nouveau profil' : 'Modifier le profil' }}
        </SheetTitle>
        <SheetDescription>
          {{ mode === 'create'
            ? 'Créez manuellement un nouveau profil alumni.'
            : 'Modifiez les informations du profil.' }}
        </SheetDescription>
      </SheetHeader>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Erreur globale -->
        <p v-if="errors._global" class="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {{ errors._global }}
        </p>

        <!-- Import Section -->
        <div v-if="mode === 'create'" class="p-4 bg-muted/30 rounded-lg border">
          <Label class="text-sm font-medium mb-2 block">Importer depuis LinkedIn</Label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Linkedin class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                v-model="importUrl" 
                placeholder="https://linkedin.com/in/username" 
                class="pl-9 bg-background"
                @keydown.enter.prevent="importFromLinkedIn"
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
              Importer
            </Button>
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Renseignez l'URL d'un profil public pour pré-remplir le formulaire.
          </p>
        </div>

        <!-- Section Identité -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identité</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="firstName" :class="cn(errors.firstName && 'text-destructive')">Prénom</Label>
              <Input
                id="firstName"
                v-model="form.firstName"
                placeholder="Alice"
                :class="cn(errors.firstName && 'border-destructive')"
              />
              <p v-if="errors.firstName" class="text-xs text-destructive">{{ errors.firstName }}</p>
            </div>
            <div class="space-y-2">
              <Label for="lastName" :class="cn(errors.lastName && 'text-destructive')">Nom</Label>
              <Input
                id="lastName"
                v-model="form.lastName"
                placeholder="Dupont"
                :class="cn(errors.lastName && 'border-destructive')"
              />
              <p v-if="errors.lastName" class="text-xs text-destructive">{{ errors.lastName }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="email" :class="cn(errors.email && 'text-destructive')">Email</Label>
            <Input
              id="email"
              type="email"
              v-model="form.email"
              placeholder="alice.dupont@exemple.com"
              :disabled="mode === 'edit'"
              :class="cn(errors.email && 'border-destructive', mode === 'edit' && 'opacity-60 cursor-not-allowed')"
            />
            <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email }}</p>
          </div>
        </div>

        <!-- Section Formation -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Formation</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="graduationYear">Promotion</Label>
              <Input
                id="graduationYear"
                type="number"
                v-model.number="form.graduationYear"
                :placeholder="String(currentYear)"
                min="1900"
                :max="currentYear + 10"
              />
            </div>
            <div class="space-y-2">
              <Label for="diploma">Diplôme</Label>
              <Input
                id="diploma"
                v-model="form.diploma"
                placeholder="Master, Bachelor, MBA…"
              />
            </div>
          </div>
        </div>

        <!-- Section Localisation -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Localisation</h3>
          <div class="space-y-2">
            <Label for="city">Ville</Label>
            <Input id="city" v-model="form.city" placeholder="Paris" />
          </div>
        </div>

        <!-- Section Parcours pro -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Parcours professionnel</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="company">Entreprise</Label>
              <Input id="company" v-model="form.company" placeholder="Société XYZ" />
            </div>
            <div class="space-y-2">
              <Label for="jobTitle">Poste</Label>
              <Input id="jobTitle" v-model="form.jobTitle" placeholder="UX Designer" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="phone">Téléphone</Label>
              <Input id="phone" v-model="form.phone" placeholder="+33 6 00 00 00 00" />
            </div>
            <div class="space-y-2">
              <Label for="linkedinUrl" :class="cn(errors.linkedinUrl && 'text-destructive')">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                v-model="form.linkedinUrl"
                placeholder="https://linkedin.com/in/…"
                :class="cn(errors.linkedinUrl && 'border-destructive')"
              />
              <p v-if="errors.linkedinUrl" class="text-xs text-destructive">{{ errors.linkedinUrl }}</p>
            </div>
          </div>
        </div>

        <SheetFooter class="pt-4 border-t gap-2">
          <SheetClose as-child>
            <Button type="button" variant="outline" :disabled="isPending">Annuler</Button>
          </SheetClose>
          <Button type="submit" :disabled="isPending">
            <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
            {{ isPending ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
