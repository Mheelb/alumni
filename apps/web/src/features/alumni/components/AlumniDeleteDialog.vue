<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
} from '@/components/ui'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  mode: 'deactivate' | 'delete'
  alumniName: string
  isPending?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const title = computed(() =>
  props.mode === 'deactivate' ? 'Désactiver le profil' : 'Supprimer le profil',
)

const description = computed(() =>
  props.mode === 'deactivate'
    ? `Le profil de ${props.alumniName} sera masqué de l'annuaire mais conservé dans la base de données. Vous pourrez le réactiver ultérieurement.`
    : `Cette action est irréversible. Le profil de ${props.alumniName} sera définitivement supprimé et son compte utilisateur associé sera révoqué.`,
)

const confirmLabel = computed(() =>
  props.mode === 'deactivate' ? 'Désactiver' : 'Supprimer définitivement',
)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <DialogClose as-child>
          <Button variant="outline" :disabled="isPending">Annuler</Button>
        </DialogClose>
        <Button
          variant="destructive"
          :disabled="isPending"
          @click="emit('confirm')"
        >
          <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
