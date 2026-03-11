export type AppUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt?: Date
  updatedAt?: Date
  role?: 'admin' | 'alumni'
  alumniId?: string | null
  firstName?: string | null
  lastName?: string | null
}
