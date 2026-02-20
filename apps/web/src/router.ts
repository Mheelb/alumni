import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'
import RegisterPage from './pages/RegisterPage.vue'
import CreateAccountPage from './pages/admin/CreateAccountPage.vue'
import UsersPage from './pages/admin/UsersPage.vue'
import AnnuairePage from './pages/AnnuairePage.vue'
import ProfilDetailPage from './pages/ProfilDetailPage.vue'
import AccountPage from './pages/AccountPage.vue'
import DashboardPage from './pages/DashboardPage.vue'
import ProfileUpdateRequestsPage from './pages/admin/ProfileUpdateRequestsPage.vue'
import ProfileUpdateRequestDetailPage from './pages/admin/ProfileUpdateRequestDetailPage.vue'
import MentionsLegalesPage from './pages/MentionsLegalesPage.vue'
import ContactPage from './pages/ContactPage.vue'
import { authClient } from './lib/auth-client'
import type { AppUser } from './types/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/dashboard', component: DashboardPage, meta: { requiresAdmin: true } },
    { path: '/login', component: LoginPage },
    { path: '/mentions-legales', component: MentionsLegalesPage },
    { path: '/contact', component: ContactPage },
    { path: '/annuaire', component: AnnuairePage, meta: { requiresAuth: true } },
    { path: '/annuaire/:id', component: ProfilDetailPage, meta: { requiresAuth: true }},
    { path: '/account', component: AccountPage, meta: { requiresAuth: true }},
    { 
      path: '/register', 
      component: RegisterPage,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/create-account/:alumniId', 
      component: CreateAccountPage,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/users', 
      component: UsersPage,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/demandes', 
      component: ProfileUpdateRequestsPage,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/demandes/:id', 
      component: ProfileUpdateRequestDetailPage,
      meta: { requiresAdmin: true }
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  if (to.meta.requiresAdmin || to.meta.requiresAuth) {
    const { data: session } = await authClient.getSession()

    if (!session) {
      return next('/login')
    }

    if (to.meta.requiresAdmin) {
      if ((session.user as AppUser).role !== 'admin') {
        return next('/')
      }
    }
  }
  next()
})

export default router
