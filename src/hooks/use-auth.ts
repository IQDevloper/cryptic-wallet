'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  userId: string
  email: string
  name: string
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me')

        if (!response.ok) {
          router.push('/login')
          return
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  return { user, loading }
}
