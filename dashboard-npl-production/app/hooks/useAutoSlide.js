'use client'

import { useState, useEffect } from 'react'

export function useAutoSlide({ onNext, interval = 30000 }) {
  const [isPaused, setIsPaused] = useState(false)
  const [countdown, setCountdown] = useState(Math.floor(interval / 1000))
  
  useEffect(() => {
    if (isPaused) return
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onNext()
          return Math.floor(interval / 1000)
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(countdownInterval)
  }, [isPaused, onNext, interval])
  
  // Listen for Enter key to pause/resume
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        setIsPaused(prev => !prev)
        setCountdown(Math.floor(interval / 1000))
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [interval])
  
  return { isPaused, countdown }
}
