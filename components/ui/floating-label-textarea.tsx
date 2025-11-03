"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FloatingLabelTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function FloatingLabelTextarea({ label, error, className, ...props }: FloatingLabelTextareaProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      setHasValue(!!textareaRef.current.value)
    }
  }, [])

  const handleFocus = () => setIsFocused(true)
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    setHasValue(!!e.target.value)
    props.onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasValue(!!e.target.value)
    props.onChange?.(e)
  }

  const isFloating = isFocused || hasValue

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          "peer w-full rounded-lg border-2 bg-card px-4 pt-6 pb-2 text-base transition-all duration-200 resize-none",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          error ? "border-destructive" : "border-input hover:border-primary/50",
          className,
        )}
        placeholder=" "
      />
      <label
        className={cn(
          "absolute left-4 text-muted-foreground transition-all duration-200 pointer-events-none",
          isFloating ? "top-2 text-xs font-medium text-primary" : "top-6 text-base",
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
