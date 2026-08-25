'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function NavAuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setIsLoggedIn(true)
      }
    })
  }, [])

  if (isLoggedIn) {
    return (
      <Link
        href="/app"
        className="font-medium hover:text-[var(--color-text-brand)] transition-colors"
      >
        Buka App
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className="font-medium hover:text-[var(--color-text-brand)] transition-colors"
    >
      Masuk
    </Link>
  )
}
