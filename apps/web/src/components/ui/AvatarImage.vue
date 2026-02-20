<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AvatarImage, type AvatarImageProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends AvatarImageProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <AvatarImage
    :class="cn('aspect-square h-full w-full object-cover', props.class)"
    v-bind="props"
  />
</template>
