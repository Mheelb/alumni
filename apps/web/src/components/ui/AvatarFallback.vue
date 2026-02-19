<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AvatarFallback, type AvatarFallbackProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends AvatarFallbackProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <AvatarFallback
    :class="cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium', props.class)"
    v-bind="props"
  >
    <slot />
  </AvatarFallback>
</template>
