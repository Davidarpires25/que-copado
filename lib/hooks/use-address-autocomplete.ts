'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { searchAddress, type AddressSuggestion } from '@/lib/services/geocoding'

interface UseAddressAutocompleteOptions {
  debounceMs?: number
  minChars?: number
}

// Nominatim usage policy requires max 1 request per second
const NOMINATIM_THROTTLE_MS = 1000

export function useAddressAutocomplete(options: UseAddressAutocompleteOptions = {}) {
  const { debounceMs = 500, minChars = 3 } = options

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref para controlar el throttling de Nominatim (1 req/seg)
  const lastRequestTime = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // No buscar si el query es muy corto
    if (query.length < minChars) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      // Throttle: asegurar 1 segundo entre requests
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime.current
      const waitTime = Math.max(0, NOMINATIM_THROTTLE_MS - timeSinceLastRequest)

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }

      setIsLoading(true)
      setError(null)

      try {
        abortControllerRef.current = new AbortController()
        lastRequestTime.current = Date.now()

        const results = await searchAddress(query)
        setSuggestions(results)
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Error al buscar dirección')
          if (process.env.NODE_ENV === 'development') {
            console.error('Geocoding error:', err)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [query, debounceMs, minChars])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  const reset = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setError(null)
  }, [])

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    clearSuggestions,
    reset,
  }
}
