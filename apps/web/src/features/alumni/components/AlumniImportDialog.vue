<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui'
import { Upload, Loader2, CheckCircle2, AlertCircle, UserPlus } from 'lucide-vue-next'
import { useImportAlumni, type ImportResult } from '@/features/alumni/composables/useAlumni'
import { authClient } from '@/lib/auth-client'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

type Phase = 'idle' | 'previewing' | 'done'

const phase = ref<Phase>('idle')
const fileName = ref('')
const parsedRows = ref<Record<string, unknown>[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const importResult = ref<ImportResult | null>(null)

const importMutation = useImportAlumni()

// Auto account creation option
const autoCreateAccounts = ref(false)
const accountsCreated = ref(0)
const accountsFailed = ref(0)
const isCreatingAccounts = ref(false)

const isPending = computed(() => importMutation.isPending.value || isCreatingAccounts.value)

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── CSV parsing ─────────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  prenom: 'firstName',
  nom: 'lastName',
  email: 'email',
  promotion: 'graduationYear',
  diplome: 'diploma',
  ville: 'city',
  entreprise: 'company',
  poste: 'jobTitle',
  telephone: 'phone',
  linkedin: 'linkedinUrl',
  firstname: 'firstName',
  lastname: 'lastName',
  graduationyear: 'graduationYear',
  diploma: 'diploma',
  city: 'city',
  company: 'company',
  jobtitle: 'jobTitle',
  phone: 'phone',
  linkedinurl: 'linkedinUrl',
}

function detectDelimiter(line: string): ',' | ';' {
  const commas = (line.match(/,/g) || []).length
  const semicolons = (line.match(/;/g) || []).length
  return semicolons >= commas ? ';' : ','
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCsv(text: string): Record<string, unknown>[] {
  // Remove BOM
  text = text.replace(/^\uFEFF/, '')

  const lines = text.split(/\r?\n/)
  const nonEmpty = lines.filter((l) => l.trim())
  if (nonEmpty.length < 2) return []

  const delimiter = detectDelimiter(nonEmpty[0])
  const rawHeaders = parseCsvLine(nonEmpty[0], delimiter)
  const headers = rawHeaders.map((h) => {
    const normalized = normalizeHeader(h)
    return HEADER_MAP[normalized] ?? normalized
  })

  return nonEmpty.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter)
    const row: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      if (!h) return
      let val: unknown = cells[i]?.trim() ?? ''

      if (h === 'graduationYear') {
        const n = Number(val)
        val = isNaN(n) || val === '' ? undefined : n
      } else if (h === 'linkedinUrl') {
        val = val === '' ? undefined : val
      } else if (val === '') {
        val = undefined
      }

      if (val !== undefined) row[h] = val
    })
    row.isActive = true
    if (!row.status) row.status = 'unlinked'
    return row
  })
}

// ─── File handling ────────────────────────────────────────────────────────────

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  fileName.value = file.name

  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    parsedRows.value = parseCsv(text)
    phase.value = 'previewing'
  }
  reader.readAsText(file, 'utf-8')
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function handleImport() {
  const result = await importMutation.mutateAsync(parsedRows.value)
  importResult.value = result

  if (autoCreateAccounts.value && result.createdAlumni.length > 0) {
    isCreatingAccounts.value = true
    accountsCreated.value = 0
    accountsFailed.value = 0

    for (const alumni of result.createdAlumni) {
      try {
        const password = generatePassword()
        const { error } = await authClient.signUp.email({
          email: alumni.email,
          password,
          name: `${alumni.firstName} ${alumni.lastName}`,
          firstName: alumni.firstName,
          lastName: alumni.lastName,
          graduationYear: alumni.graduationYear,
          alumniId: alumni._id,
        } as Parameters<typeof authClient.signUp.email>[0])

        if (!error) {
          await axios.put(`${API}/alumni/${alumni._id}`, { status: 'invited' }, { withCredentials: true })
          accountsCreated.value++
        } else {
          accountsFailed.value++
        }
      } catch {
        accountsFailed.value++
      }
    }

    isCreatingAccounts.value = false
  }

  phase.value = 'done'
}

// ─── Reset ────────────────────────────────────────────────────────────────────

function resetDialog() {
  phase.value = 'idle'
  fileName.value = ''
  parsedRows.value = []
  importResult.value = null
  autoCreateAccounts.value = false
  accountsCreated.value = 0
  accountsFailed.value = 0
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleClose() {
  resetDialog()
  emit('update:open', false)
}

// Preview columns (first 5 rows, first 5 columns)
const PREVIEW_FIELDS = ['firstName', 'lastName', 'email', 'graduationYear', 'diploma']
</script>

<template>
  <Dialog :open="open" @update:open="(v) => { if (!v) handleClose() }">
    <DialogContent class="sm:max-w-2xl">
      <!-- ── IDLE ── -->
      <template v-if="phase === 'idle'">
        <DialogHeader>
          <DialogTitle>Importer des alumni depuis un CSV</DialogTitle>
          <DialogDescription>
            Formats acceptés : CSV avec séparateur <code>;</code> ou <code>,</code>, encodage UTF-8 ou UTF-8 BOM (export Excel).
            En-têtes français (<em>Prénom, Nom, Email…</em>) ou anglais (<em>firstName, lastName…</em>).
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed rounded-lg">
          <Upload class="h-10 w-10 text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Sélectionnez un fichier CSV à importer</p>
          <Button variant="outline" @click="triggerFileInput">Choisir un fichier</Button>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          @change="handleFileChange"
        />

        <DialogFooter>
          <Button variant="outline" @click="handleClose">Annuler</Button>
        </DialogFooter>
      </template>

      <!-- ── PREVIEWING ── -->
      <template v-else-if="phase === 'previewing'">
        <DialogHeader>
          <DialogTitle>Prévisualisation</DialogTitle>
          <DialogDescription>
            Fichier : <strong>{{ fileName }}</strong> — {{ parsedRows.length }} ligne{{ parsedRows.length > 1 ? 's' : '' }} détectée{{ parsedRows.length > 1 ? 's' : '' }}
          </DialogDescription>
        </DialogHeader>

        <div class="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="f in PREVIEW_FIELDS" :key="f" class="text-xs">{{ f }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, i) in parsedRows.slice(0, 5)" :key="i">
                <TableCell v-for="f in PREVIEW_FIELDS" :key="f" class="text-xs">
                  {{ row[f] ?? '—' }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p v-if="parsedRows.length > 5" class="text-xs text-muted-foreground">
          … et {{ parsedRows.length - 5 }} ligne{{ parsedRows.length - 5 > 1 ? 's' : '' }} supplémentaire{{ parsedRows.length - 5 > 1 ? 's' : '' }}.
        </p>

        <!-- Option création de comptes -->
        <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            v-model="autoCreateAccounts"
            class="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
          />
          <div>
            <p class="text-sm font-medium flex items-center gap-1.5">
              <UserPlus class="h-4 w-4 text-primary" />
              Créer automatiquement un compte pour chaque profil importé
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Un compte lié sera créé avec un mot de passe aléatoire. Les alumni pourront le réinitialiser via "Mot de passe oublié".
            </p>
          </div>
        </label>

        <DialogFooter class="gap-2">
          <Button variant="outline" :disabled="isPending" @click="resetDialog">
            Choisir un autre fichier
          </Button>
          <Button :disabled="isPending || parsedRows.length === 0" @click="handleImport">
            <Loader2 v-if="isPending" class="mr-2 h-4 w-4 animate-spin" />
            <span v-if="isCreatingAccounts">Création des comptes…</span>
            <span v-else>Importer {{ parsedRows.length }} ligne{{ parsedRows.length > 1 ? 's' : '' }}</span>
          </Button>
        </DialogFooter>
      </template>

      <!-- ── DONE ── -->
      <template v-else-if="phase === 'done' && importResult">
        <DialogHeader>
          <DialogTitle>Import terminé</DialogTitle>
        </DialogHeader>

        <div class="space-y-4">
          <!-- Summary -->
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2 text-green-600">
              <CheckCircle2 class="h-5 w-5" />
              <span class="font-semibold">{{ importResult.imported }} profil{{ importResult.imported > 1 ? 's' : '' }} importé{{ importResult.imported > 1 ? 's' : '' }}</span>
            </div>
            <div v-if="accountsCreated > 0" class="flex items-center gap-2 text-blue-600">
              <UserPlus class="h-5 w-5" />
              <span class="font-semibold">{{ accountsCreated }} compte{{ accountsCreated > 1 ? 's' : '' }} créé{{ accountsCreated > 1 ? 's' : '' }}</span>
            </div>
            <div v-if="importResult.skipped > 0" class="flex items-center gap-2 text-amber-600">
              <AlertCircle class="h-5 w-5" />
              <span class="font-semibold">{{ importResult.skipped }} ignoré{{ importResult.skipped > 1 ? 's' : '' }}</span>
            </div>
            <div v-if="accountsFailed > 0" class="flex items-center gap-2 text-amber-600">
              <AlertCircle class="h-5 w-5" />
              <span class="font-semibold">{{ accountsFailed }} compte{{ accountsFailed > 1 ? 's' : '' }} en échec</span>
            </div>
          </div>

          <!-- Errors list (max 10) -->
          <div v-if="importResult.errors.length > 0" class="space-y-1">
            <p class="text-sm font-medium text-muted-foreground">Détails des erreurs :</p>
            <ul class="text-sm space-y-1 max-h-48 overflow-y-auto">
              <li
                v-for="err in importResult.errors.slice(0, 10)"
                :key="err.row"
                class="flex gap-2 text-destructive"
              >
                <span class="shrink-0">Ligne {{ err.row }}</span>
                <span class="text-muted-foreground shrink-0">{{ err.email || '—' }}</span>
                <span>{{ err.reason }}</span>
              </li>
              <li v-if="importResult.errors.length > 10" class="text-muted-foreground">
                … et {{ importResult.errors.length - 10 }} autre{{ importResult.errors.length - 10 > 1 ? 's' : '' }} erreur{{ importResult.errors.length - 10 > 1 ? 's' : '' }}.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" @click="resetDialog">Importer un autre fichier</Button>
          <Button @click="handleClose">Fermer</Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>
