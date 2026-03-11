<script setup lang="ts">
import { ref } from 'vue'
import { Input, Button, Label } from '@/components/ui'
import { EventSchema } from '@alumni/shared-schema'
import type { EventInput } from '@alumni/shared-schema'

const props = defineProps<{ initial?: Partial<EventInput> }>()
const emit = defineEmits<{ submit: [data: EventInput]; cancel: [] }>()

function toDatetimeLocal(iso?: string) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

const form = ref({
  title: props.initial?.title ?? '',
  description: props.initial?.description ?? '',
  startDate: toDatetimeLocal(props.initial?.startDate),
  endDate: toDatetimeLocal(props.initial?.endDate),
  location: props.initial?.location ?? '',
  imageUrl: props.initial?.imageUrl ?? '',
})

const errors = ref<Record<string, string>>({})

function handleSubmit() {
  errors.value = {}
  const payload = {
    ...form.value,
    startDate: form.value.startDate ? new Date(form.value.startDate).toISOString() : '',
    endDate: form.value.endDate ? new Date(form.value.endDate).toISOString() : '',
    imageUrl: form.value.imageUrl || null,
  }
  const result = EventSchema.safeParse(payload)
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
    <div class="flex flex-col gap-1.5">
      <Label for="title">Titre *</Label>
      <Input id="title" v-model="form.title" placeholder="Nom de l'événement" />
      <p v-if="errors.title" class="text-xs text-destructive">{{ errors.title }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="description">Description *</Label>
      <textarea
        id="description"
        v-model="form.description"
        rows="4"
        placeholder="Description de l'événement..."
        class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p v-if="errors.description" class="text-xs text-destructive">{{ errors.description }}</p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <Label for="startDate">Date de début *</Label>
        <Input id="startDate" type="datetime-local" v-model="form.startDate" />
        <p v-if="errors.startDate" class="text-xs text-destructive">{{ errors.startDate }}</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <Label for="endDate">Date de fin *</Label>
        <Input id="endDate" type="datetime-local" v-model="form.endDate" />
        <p v-if="errors.endDate" class="text-xs text-destructive">{{ errors.endDate }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="location">Lieu *</Label>
      <Input id="location" v-model="form.location" placeholder="Paris, France" />
      <p v-if="errors.location" class="text-xs text-destructive">{{ errors.location }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="imageUrl">URL de l'image (optionnel)</Label>
      <Input id="imageUrl" v-model="form.imageUrl" placeholder="https://..." />
      <p v-if="errors.imageUrl" class="text-xs text-destructive">{{ errors.imageUrl }}</p>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancel')">Annuler</Button>
      <Button type="submit">Enregistrer</Button>
    </div>
  </form>
</template>
