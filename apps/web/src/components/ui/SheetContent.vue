<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, type DialogContentProps } from 'radix-vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { X } from 'lucide-vue-next'

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background p-6 shadow-lg',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b',
        bottom: 'inset-x-0 bottom-0 border-t',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-xl',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
)

type SheetVariants = VariantProps<typeof sheetVariants>

interface Props extends DialogContentProps {
  side?: SheetVariants['side']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  side: 'right',
})
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <DialogContent
      :class="cn(sheetVariants({ side }), props.class)"
      v-bind="{ ...props, class: undefined }"
    >
      <slot />
      <DialogClose
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Fermer</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
