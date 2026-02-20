<script setup lang="ts">
import { ref } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@/components/ui'
import { Mail, MessageSquare, Send, CheckCircle2, Loader2 } from 'lucide-vue-next'

const form = ref({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const isPending = ref(false)
const isSuccess = ref(false)

async function handleSubmit() {
  isPending.value = true
  // Simulation d'envoi
  await new Promise(resolve => setTimeout(resolve, 1500))
  isPending.value = false
  isSuccess.value = true
  form.value = { name: '', email: '', subject: '', message: '' }
}
</script>

<template>
  <div class="container flex-1 flex flex-col justify-center py-12 max-w-2xl">
    <div v-if="isSuccess" class="text-center py-12 space-y-4">
      <div class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 class="h-10 w-10" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Message envoyé !</h1>
      <p class="text-muted-foreground">
        Merci de nous avoir contactés. Notre équipe vous répondra dans les plus brefs délais.
      </p>
      <Button variant="outline" @click="isSuccess = false">Envoyer un autre message</Button>
    </div>

    <Card v-else>
      <CardHeader>
        <CardTitle class="text-2xl flex items-center gap-2">
          <Mail class="h-6 w-6 text-primary" />
          Contactez-nous
        </CardTitle>
        <CardDescription>
          Une question ? Un problème technique ? Utilisez le formulaire ci-dessous pour nous envoyer un message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="name">Nom complet</Label>
              <Input id="name" v-model="form.name" placeholder="Alice Dupont" required :disabled="isPending" />
            </div>
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input id="email" type="email" v-model="form.email" placeholder="alice@exemple.com" required :disabled="isPending" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="subject">Sujet</Label>
            <Input id="subject" v-model="form.subject" placeholder="Ex: Problème de connexion" required :disabled="isPending" />
          </div>

          <div class="space-y-2">
            <Label for="message">Message</Label>
            <textarea
              id="message"
              v-model="form.message"
              class="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Votre message ici..."
              required
              :disabled="isPending"
            ></textarea>
          </div>

          <Button type="submit" class="w-full gap-2" :disabled="isPending">
            <Loader2 v-if="isPending" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            {{ isPending ? 'Envoi en cours...' : 'Envoyer le message' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
