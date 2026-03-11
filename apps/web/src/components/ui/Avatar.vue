<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AvatarRoot, type AvatarRootProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends AvatarRootProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <AvatarRoot :class="cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', props.class)" v-bind="props">
    <slot />
  </AvatarRoot>
</template>
