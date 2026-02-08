'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAddressAutocomplete } from '@/lib/hooks/use-address-autocomplete'
import type { AddressSuggestion } from '@/lib/services/geocoding'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void
  onSelect?: (suggestion: AddressSuggestion) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Ej: Av. Corrientes 1234, Buenos Aires',
  label = 'Dirección',
  required = false,
  disabled = false,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { query, setQuery, suggestions, isLoading, error, clearSuggestions } =
    useAddressAutocomplete()

  // Sincroniza el valor externo con el query interno
  useEffect(() => {
    if (value !== query) {
      setQuery(value)
    }
  }, [value, setQuery])

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (newValue: string) => {
    setQuery(newValue)
    onChange(newValue)
    setIsOpen(true)
    setSelectedIndex(-1)
  }

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.shortAddress, suggestion.coordinates)
    setQuery(suggestion.shortAddress)
    setIsOpen(false)
    clearSuggestions()
    onSelect?.(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative space-y-2">
      <Label
        htmlFor="address-autocomplete"
        className="text-orange-800 font-semibold flex items-center gap-2"
      >
        <MapPin className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400 pointer-events-none" />
        <Input
          ref={inputRef}
          id="address-autocomplete"
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="input-large border-orange-200 focus:border-orange-400 pl-10 pr-10"
          autoComplete="off"
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-orange-200 rounded-xl shadow-warm-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-orange-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-orange-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orange-900">
                    {suggestion.shortAddress}
                  </p>
                  <p className="text-xs text-orange-600/70 truncate mt-0.5">
                    {suggestion.fullAddress}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {/* Hint */}
      {!error && query.length > 0 && query.length < 3 && (
        <p className="text-xs text-orange-600/70">
          Escribí al menos 3 caracteres para buscar
        </p>
      )}
    </div>
  )
}
