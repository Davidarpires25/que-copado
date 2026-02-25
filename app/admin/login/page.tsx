'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/app/actions/auth'
import { toast } from 'sonner'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await signIn(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#12151a] via-[#1a1d24] to-[#12151a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FEC501] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <Card className="w-full max-w-md bg-[#1a1d24]/80 backdrop-blur-xl border-[#252a35] shadow-2xl">
          <CardHeader className="text-center pb-6 space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto w-20 h-20 bg-[#FEC501] rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-[#FEC501]/25"
            >
              🍔
            </motion.div>
            <div>
              <CardTitle className="text-3xl font-bold text-[#f0f2f5] mb-2">
                Que <span className="text-[#FEC501]">Copado</span>
              </CardTitle>
              <p className="text-[#a8b5c9]">Panel de Administracion</p>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#c4cdd9] text-sm font-medium">
                  Email
                </Label>
                <div className="relative group">
                  <Mail
                    className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-200 ${
                      focusedInput === 'email' ? 'text-[#FEC501]' : 'text-[#a8b5c9]'
                    }`}
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Ingresa tu email"
                    required
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 h-12 bg-[#252a35] border-[#2a2f3a] text-[#f0f2f5] placeholder:text-[#a8b5c9] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#c4cdd9] text-sm font-medium">
                  Contrasena
                </Label>
                <div className="relative group">
                  <Lock
                    className={`absolute left-3.5 top-3.5 h-4 w-4 transition-colors duration-200 ${
                      focusedInput === 'password' ? 'text-[#FEC501]' : 'text-[#a8b5c9]'
                    }`}
                  />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña"
                    required
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 pr-10 h-12 bg-[#252a35] border-[#2a2f3a] text-[#f0f2f5] placeholder:text-[#a8b5c9] placeholder:italic focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#a8b5c9] hover:text-[#f0f2f5] transition-colors duration-200"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Iniciando sesion...</span>
                  </div>
                ) : (
                  'Iniciar Sesion'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
