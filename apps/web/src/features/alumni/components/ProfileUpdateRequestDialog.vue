<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { type AlumniProfileType, type AlumniUpdateType } from '@alumni/shared-schema'
import type { AlumniDetail } from '../composables/useAlumni'
import { useCreateProfileUpdateRequest } from '../composables/useProfileUpdateRequests'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-vue-next'

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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Demander une modification</DialogTitle>
        <DialogDescription>
          Modifiez les informations ci-dessous. Un administrateur validera votre demande.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 py-4" @submit.prevent="handleSubmit">
        <p v-if="errors._global" class="text-sm font-medium text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {{ errors._global }}
        </p>

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

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="city">Ville</Label>
            <Input id="city" v-model="form.city" :disabled="isPending" />
          </div>
          <div class="space-y-2">
            <Label for="phone">Téléphone</Label>
            <Input 
              id="phone" 
              v-model="form.phone" 
              type="tel" 
              @input="form.phone = form.phone?.replace(/\D/g, '')"
              :disabled="isPending" 
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="linkedinUrl">LinkedIn</Label>
          <Input id="linkedinUrl" v-model="form.linkedinUrl" placeholder="https://linkedin.com/in/..." :disabled="isPending" />
        </div>

        <DialogFooter class="pt-4 border-t gap-2">
          <DialogClose as-child>
            <Button type="button" variant="outline" :disabled="isPending">Annuler</Button>
          </DialogClose>
          <Button type="submit" :disabled="isPending || !hasChanges">
            <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
            {{ isPending ? 'Envoi...' : 'Envoyer la demande' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
