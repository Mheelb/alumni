<script setup lang="ts">
import { ref } from 'vue'
import { Input, Button, Label } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { JobAnnouncementSchema } from '@alumni/shared-schema'
import type { JobAnnouncementInput } from '@alumni/shared-schema'

const props = defineProps<{ initial?: Partial<JobAnnouncementInput> }>()
const emit = defineEmits<{ submit: [data: JobAnnouncementInput]; cancel: [] }>()

const form = ref({
  title: props.initial?.title ?? '',
  company: props.initial?.company ?? '',
  type: props.initial?.type ?? 'CDI',
  location: props.initial?.location ?? '',
  description: props.initial?.description ?? '',
  url: props.initial?.url ?? '',
  status: props.initial?.status ?? 'draft',
})

const errors = ref<Record<string, string>>({})

function handleSubmit() {
  errors.value = {}
  const payload = { ...form.value, url: form.value.url || null }
  const result = JobAnnouncementSchema.safeParse(payload)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      errors.value[key] = issue.message
    }
    return
  }
  emit('submit', result.data)
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <Label for="title">Titre du poste *</Label>
        <Input id="title" v-model="form.title" placeholder="Développeur Full Stack" />
        <p v-if="errors.title" class="text-xs text-destructive">{{ errors.title }}</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="company">Entreprise *</Label>
        <Input id="company" v-model="form.company" placeholder="Acme Corp" />
        <p v-if="errors.company" class="text-xs text-destructive">{{ errors.company }}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <Label>Type de contrat *</Label>
        <Select v-model="form.type">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="CDI">CDI</SelectItem>
            <SelectItem value="CDD">CDD</SelectItem>
            <SelectItem value="stage">Stage</SelectItem>
            <SelectItem value="alternance">Alternance</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
          </SelectContent>
        </Select>
        <p v-if="errors.type" class="text-xs text-destructive">{{ errors.type }}</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label>Statut</Label>
        <Select v-model="form.status">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="closed">Clôturé</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="location">Lieu *</Label>
      <Input id="location" v-model="form.location" placeholder="Paris" />
      <p v-if="errors.location" class="text-xs text-destructive">{{ errors.location }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="description">Description *</Label>
      <textarea
        id="description"
        v-model="form.description"
        rows="4"
        placeholder="Description du poste..."
        class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p v-if="errors.description" class="text-xs text-destructive">{{ errors.description }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="url">Lien vers l'offre (optionnel)</Label>
      <Input id="url" v-model="form.url" placeholder="https://..." />
      <p v-if="errors.url" class="text-xs text-destructive">{{ errors.url }}</p>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">Annuler</Button>
      <Button type="submit">Enregistrer</Button>
    </div>
  </form>
</template>
