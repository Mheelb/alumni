<script setup lang="ts">
import { computed } from 'vue'
import type { AlumniStatus } from '@alumni/shared-schema'
import { Badge } from '@/components/ui'
import { Mail, UserCheck, UserMinus } from 'lucide-vue-next'

const props = defineProps<{ status: AlumniStatus }>()

const config = computed(() => {
  switch (props.status) {
    case 'unlinked':
      return { label: 'Sans compte', variant: 'outline' as const, icon: UserMinus }
    case 'invited':
      return { label: 'Invité', variant: 'secondary' as const, icon: Mail }
    case 'registered':
      return { label: 'Inscrit', variant: 'default' as const, icon: UserCheck }
  }
})
</script>

<template>
  <Badge :variant="config.variant" class="flex items-center gap-1 w-fit">
    <component :is="config.icon" class="h-3 w-3" />
    {{ config.label }}
  </Badge>
</template>
