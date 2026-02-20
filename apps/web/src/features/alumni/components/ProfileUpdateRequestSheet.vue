<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { type AlumniProfileType, type AlumniUpdateType } from '@alumni/shared-schema'
import type { AlumniDetail } from '../composables/useAlumni'
import { useCreateProfileUpdateRequest } from '../composables/useProfileUpdateRequests'
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
import { Loader2, FileEdit, User, GraduationCap, Briefcase, MapPin, Phone, Linkedin } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  alumni: AlumniDetail
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const currentYear = new Date().getFullYear()

const form = ref<Partial<AlumniProfileType>>({})
const errors = ref<Record<string, string>>({})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    errors.value = {}
    form.value = {
      firstName: props.alumni.firstName,
      lastName: props.alumni.lastName,
      graduationYear: props.alumni.graduationYear ?? null,
      diploma: props.alumni.diploma ?? '',
      city: props.alumni.city ?? '',
      company: props.alumni.company ?? '',
      jobTitle: props.alumni.jobTitle ?? '',
      phone: props.alumni.phone ?? '',
      linkedinUrl: props.alumni.linkedinUrl ?? '',
    }
  },
  { immediate: true },
)

const createRequestMutation = useCreateProfileUpdateRequest()
const isPending = computed(() => createRequestMutation.isPending.value)

const hasChanges = computed(() => {
  const fields: (keyof AlumniUpdateType)[] = [
    'firstName', 'lastName', 'graduationYear', 'diploma', 
    'city', 'company', 'jobTitle', 'phone', 'linkedinUrl'
  ]

  return fields.some(field => {
    const newValue = form.value[field]
    const oldValue = (props.alumni as any)[field]
    
    const normalizedNew = (newValue === '' || newValue === null || newValue === undefined) ? null : newValue
    const normalizedOld = (oldValue === '' || oldValue === null || oldValue === undefined) ? null : oldValue

    return normalizedNew !== normalizedOld
  })
})

function validate(): boolean {
  errors.value = {}
  if (!form.value.firstName || form.value.firstName.length < 2)
    errors.value.firstName = 'Le prénom doit contenir au moins 2 caractères'
  if (!form.value.lastName || form.value.lastName.length < 2)
    errors.value.lastName = 'Le nom doit contenir au moins 2 caractères'
  
  if (form.value.graduationYear) {
    const yearStr = form.value.graduationYear.toString()
    if (yearStr.length !== 4) {
      errors.value.graduationYear = 'La promotion doit comporter exactement 4 chiffres'
    }
  }

  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return

  errors.value = {}
  
  const changes: AlumniUpdateType = {}
  const fields: (keyof AlumniUpdateType)[] = [
    'firstName', 'lastName', 'graduationYear', 'diploma', 
    'city', 'company', 'jobTitle', 'phone', 'linkedinUrl'
  ]

  fields.forEach(field => {
    const newValue = form.value[field]
    const oldValue = (props.alumni as any)[field]
    
    const normalizedNew = (newValue === '' || newValue === null || newValue === undefined) ? null : newValue
    const normalizedOld = (oldValue === '' || oldValue === null || oldValue === undefined) ? null : oldValue

    if (normalizedNew !== normalizedOld) {
      (changes as any)[field] = normalizedNew
    }
  })

  if (Object.keys(changes).length === 0) {
    errors.value._global = 'Aucune modification détectée.'
    return
  }

  createRequestMutation.mutate({
    alumniId: props.alumni._id,
    changes
  }, {
    onSuccess: () => {
      emit('success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Une erreur est survenue lors de l&apos;envoi de la demande'
      errors.value._global = msg
    }
  })
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-2xl p-0 flex flex-col h-full">
      <div class="flex-1 overflow-y-auto p-6">
        <SheetHeader class="mb-8">
          <SheetTitle class="flex items-center gap-2 text-2xl">
            <FileEdit class="h-6 w-6 text-primary" />
            Demander une modification
          </SheetTitle>
          <SheetDescription class="text-base">
            Modifiez les informations ci-dessous. Un administrateur validera votre demande avant qu'elle ne soit appliquée à votre profil public.
          </SheetDescription>
        </SheetHeader>

        <form id="profile-update-form" class="space-y-8" @submit.prevent="handleSubmit">
          <!-- Erreur globale -->
          <p v-if="errors._global" class="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
            {{ errors._global }}
          </p>

          <!-- Section Identité -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User class="h-4 w-4" />
              Identité
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="firstName" :class="cn(errors.firstName && 'text-destructive')">Prénom</Label>
                <Input id="firstName" v-model="form.firstName" :class="cn(errors.firstName && 'border-destructive')" :disabled="isPending" />
                <p v-if="errors.firstName" class="text-xs text-destructive">{{ errors.firstName }}</p>
              </div>
              <div class="space-y-2">
                <Label for="lastName" :class="cn(errors.lastName && 'text-destructive')">Nom</Label>
                <Input id="lastName" v-model="form.lastName" :class="cn(errors.lastName && 'border-destructive')" :disabled="isPending" />
                <p v-if="errors.lastName" class="text-xs text-destructive">{{ errors.lastName }}</p>
              </div>
            </div>
          </div>

          <!-- Section Formation -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <GraduationCap class="h-4 w-4" />
              Formation
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="graduationYear" :class="cn(errors.graduationYear && 'text-destructive')">Promotion</Label>
                <Input id="graduationYear" type="number" v-model.number="form.graduationYear" min="1000" max="9999" :class="cn(errors.graduationYear && 'border-destructive')" :disabled="isPending" />
                <p v-if="errors.graduationYear" class="text-xs text-destructive">{{ errors.graduationYear }}</p>
              </div>
              <div class="space-y-2">
                <Label for="diploma">Diplôme</Label>
                <Input id="diploma" v-model="form.diploma" placeholder="Master, Bachelor..." :disabled="isPending" />
              </div>
            </div>
          </div>

          <!-- Section Parcours pro -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Briefcase class="h-4 w-4" />
              Parcours professionnel
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="company">Entreprise</Label>
                <Input id="company" v-model="form.company" :disabled="isPending" />
              </div>
              <div class="space-y-2">
                <Label for="jobTitle">Poste</Label>
                <Input id="jobTitle" v-model="form.jobTitle" :disabled="isPending" />
              </div>
            </div>
          </div>

          <!-- Section Localisation & Contact -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin class="h-4 w-4" />
              Localisation & Contact
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="city">Ville</Label>
                <Input id="city" v-model="form.city" :disabled="isPending" />
              </div>
              <div class="space-y-2">
                <Label for="phone">Téléphone</Label>
                <div class="relative">
                  <Phone class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    v-model="form.phone" 
                    type="tel" 
                    class="pl-9"
                    @input="form.phone = form.phone?.replace(/\D/g, '')"
                    :disabled="isPending" 
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Section Réseaux Sociaux -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Linkedin class="h-4 w-4" />
              Réseaux Sociaux
            </h3>
            <div class="space-y-2">
              <Label for="linkedinUrl">LinkedIn</Label>
              <div class="relative">
                <Linkedin class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="linkedinUrl" v-model="form.linkedinUrl" placeholder="https://linkedin.com/in/..." class="pl-9" :disabled="isPending" />
              </div>
            </div>
          </div>
        </form>
      </div>

      <SheetFooter class="p-6 border-t bg-muted/20 gap-2 sm:gap-0">
        <SheetClose as-child>
          <Button type="button" variant="outline" :disabled="isPending">Annuler</Button>
        </SheetClose>
        <Button type="submit" form="profile-update-form" :disabled="isPending || !hasChanges">
          <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
          {{ isPending ? 'Envoi...' : 'Envoyer la demande' }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
