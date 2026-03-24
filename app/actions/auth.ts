'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/server/rate-limit'

export async function signIn(formData: FormData) {
  const supabase = await createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validar inputs
  if (!email?.trim()) {
    return { error: 'El email es requerido' }
  }

  if (!password?.trim()) {
    return { error: 'La contraseña es requerida' }
  }

  // Validar formato de email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'El formato del email no es válido' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' }
  }

  // Rate limit: 5 intentos por email cada 15 minutos
  const { allowed } = checkRateLimit(`signin:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
  if (!allowed) {
    return { error: 'Demasiados intentos fallidos. Esperá 15 minutos e intentá de nuevo.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    return { error: 'Credenciales inválidas' }
  }

  redirect('/admin/dashboard')
}

export async function signOut() {
  const supabase = await createAdminClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
