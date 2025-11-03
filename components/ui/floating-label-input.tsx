"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FloatingLabelInput({ label, error, className, ...props }: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      setHasValue(!!inputRef.current.value)
    }
  }, [])

  const handleFocus = () => setIsFocused(true)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    setHasValue(!!e.target.value)
    props.onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value)
    props.onChange?.(e)
  }

  const isFloating = isFocused || hasValue

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          "peer w-full rounded-lg border-2 bg-card px-4 pt-6 pb-2 text-base transition-all duration-200",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          error ? "border-destructive" : "border-input hover:border-primary/50",
          className,
        )}
        placeholder=" "
      />
      <label
        className={cn(
          "absolute left-4 text-muted-foreground transition-all duration-200 pointer-events-none",
          isFloating ? "top-2 text-xs font-medium text-primary" : "top-1/2 -translate-y-1/2 text-base",
        )}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>
      )}
    </div>
  )
}
