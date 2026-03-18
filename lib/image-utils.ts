import * as React from 'react'

// Utilidades para manejo de imágenes con fallback

/**
 * Función para obtener URL de imagen con fallback
 * @param imageUrl - URL de la imagen del usuario
 * @param fallbackUrl - URL de imagen por defecto
 * @returns URL válida para mostrar
 */
export function getImageUrl(imageUrl?: string, fallbackUrl: string = '/images/avatar-default.png'): string {
  // Si no hay imagen o está vacía, usar fallback
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl
  }
  
  // Si es la ruta problemática, usar fallback
  if (imageUrl === '/images/avatar.jpeg') {
    return fallbackUrl
  }
  
  return imageUrl
}

/**
 * Manejador de error para imágenes con fallback
 * @param event - Evento de error de imagen
 * @param fallbackUrl - URL de imagen por defecto
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>, fallbackUrl: string = '/images/avatar-default.png') {
  const target = event.target as HTMLImageElement
  
  // Evitar bucle infinito de errores
  if (target.src !== fallbackUrl && !target.src.includes('avatar-default')) {
    target.src = fallbackUrl
  }
}

/**
 * Props para componente img con manejo de errores
 */
export interface ImageWithFallbackProps {
  src?: string
  alt: string
  className?: string
  fallback?: string
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Componente de imagen con fallback automático
 */
export function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  fallback = '/images/avatar-default.png',
  onError 
}: ImageWithFallbackProps) {
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (onError) {
      onError(event)
    } else {
      handleImageError(event, fallback)
    }
  }

  return React.createElement('img', {
    src: getImageUrl(src, fallback),
    alt,
    className,
    onError: handleError
  })
}
