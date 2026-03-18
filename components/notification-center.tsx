'use client'

import { useState, useEffect, useRef } from 'react'
import { useCentralNotifications } from '@/hooks/useCentralNotifications'
import { Bell, X, Check, Trash2 } from 'lucide-react'

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, clearAll } = useCentralNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Ahora'
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`
    return `Hace ${Math.floor(diff / 86400000)} días`
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋'
      case 'product-low-stock': return '📦'
      case 'product-expired': return '⏰'
      case 'household-join': return '🏠'
      default: return '🔔'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de notificaciones */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Notificaciones ({unreadCount} no leídas)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  notifications.forEach(n => !n.read && markAsRead(n.id))
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Marcar todas como leídas
              </button>
              <button
                onClick={() => {
                  console.log('🗑️ Limpiando todas las notificaciones...')
                  clearAll()
                  setIsOpen(false) // Cerrar el dropdown después de limpiar
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Limpiar todas las notificaciones"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {notification.body}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="mt-1 p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
