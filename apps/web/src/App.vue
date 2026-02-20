<script setup lang="ts">
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui';
import { computed } from 'vue';
import {
  Users,
  ShieldCheck,
  UserCircle,
  LogOut,
  User,
  LayoutDashboard,
  FileEdit
} from 'lucide-vue-next';
import { authClient } from '@/lib/auth-client';
import type { AppUser } from '@/types/user';
import { useAlumniDetail } from '@/features/alumni/composables/useAlumni';
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router';
import { useProfileUpdateRequests } from '@/features/alumni/composables/useProfileUpdateRequests';
import { computed, reactive } from 'vue';
import logo from '@/assets/logo.svg';

const router = useRouter();
const route = useRoute();
const session = authClient.useSession();
const user = computed(() => session.value?.data?.user as AppUser | undefined);
const alumniId = computed(() => user.value?.alumniId as string | undefined);
const { data: alumni } = useAlumniDetail(alumniId);

const isAdmin = computed(() => (session.data?.value?.user as any)?.role === 'admin');
const pendingFilters = reactive({ status: 'pending' as const });
const { data: pendingRequests } = useProfileUpdateRequests(pendingFilters, isAdmin);
const pendingCount = computed(() => pendingRequests.value?.length ?? 0);

async function handleLogout() {
  await authClient.signOut();
  router.push('/login');
}

function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background font-sans text-foreground antialiased">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2">
          <img :src="logo" alt="Logo" class="h-8 w-auto" />
        </RouterLink>

        <nav class="flex items-center gap-4">
          <template v-if="session.data?.user">
            <RouterLink v-if="user?.role === 'admin'" to="/dashboard">
              <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
                <LayoutDashboard class="h-4 w-4" />
                Dashboard
              </Button>
            </RouterLink>
            <RouterLink to="/annuaire">
              <Button 
                :variant="route.path.startsWith('/annuaire') ? 'secondary' : 'ghost'" 
                size="sm" 
                class="hidden sm:flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Users class="h-4 w-4" />
                Annuaire
              </Button>
            </RouterLink>
            <!-- @ts-ignore - role exists on user -->
            <template v-if="session.data.user.role === 'admin'">
              <RouterLink to="/admin/demandes">
                <Button
                  :variant="route.path.startsWith('/admin/demandes') ? 'secondary' : 'ghost'"
                  size="sm"
                  class="hidden sm:flex items-center gap-2 relative hover:text-primary transition-colors"
                >
                  <FileEdit class="h-4 w-4" />
                  Demandes
                  <span v-if="pendingCount > 0" class="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-amber-500" />
                </Button>
              </RouterLink>
              <RouterLink to="/admin/users">
                <Button
                  :variant="route.path === '/admin/users' ? 'secondary' : 'ghost'"
                  size="sm"
                  class="hidden sm:flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <ShieldCheck class="h-4 w-4" />
                  Comptes
                </Button>
              </RouterLink>
            </template>
          </template>
          <div class="h-6 w-px bg-border hidden sm:block"></div>
          
          <template v-if="session.data?.user">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="relative h-9 w-9 rounded-full p-0">
                  <Avatar class="h-9 w-9 border border-border">
                    <AvatarImage v-if="alumni?.avatarUrl" :src="alumni.avatarUrl" :alt="session.data.user.name" />
                    <AvatarFallback class="text-xs bg-primary/5 text-primary">
                      {{ getInitials(session.data.user.name) }}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56" align="end">
                <DropdownMenuLabel class="font-normal">
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium leading-none">{{ session.data.user.name }}</p>
                    <p class="text-xs leading-none text-muted-foreground">{{ session.data.user.email }}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="router.push('/account')">
                  <User class="mr-2 h-4 w-4" />
                  <span>Mon compte</span>
                </DropdownMenuItem>
                <DropdownMenuItem v-if="user?.alumniId" @click="router.push('/annuaire/' + user?.alumniId)">
                  <UserCircle class="mr-2 h-4 w-4" />
                  <span>Mon profil alumni</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleLogout" class="text-destructive focus:text-destructive">
                  <LogOut class="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>
          <template v-else>
            <RouterLink to="/login">
              <Button variant="default" size="sm">Connexion</Button>
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main class="relative flex-1 flex flex-col">
      <!-- Background pattern -->
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-6 md:py-0">
      <div class="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p class="text-center text-sm text-muted-foreground md:text-left">
          © {{ new Date().getFullYear() }} <span class="font-medium text-foreground">My Digital School</span> — Plateforme alumni
        </p>
        <div class="flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <RouterLink to="/mentions-legales" class="hover:text-primary transition-colors">Mentions légales</RouterLink>
          <RouterLink to="/contact" class="hover:text-primary transition-colors">Contact</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Container utility if not provided by tailwind-animate or similar */
.container {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  padding-right: 2rem;
  padding-left: 2rem;
}

@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
  }
}
</style>

<style>
@import "tailwindcss";
</style>
