import { useEffect, useState } from 'react'

interface NotificationPermission {
  permission: NotificationPermission
  isSupported: boolean
}

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    permission: 'default',
    isSupported: false
  })

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if ('Notification' in window) {
      console.log('🔔 Browser supports notifications')
      console.log('🔔 Current permission:', Notification.permission)
      setPermission({
        permission: Notification.permission,
        isSupported: true
      })

      // Verificar si estamos en HTTPS o localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('⚠️ Notifications require HTTPS or localhost')
      }

      // Verificar si el Service Worker está soportado
      if ('serviceWorker' in navigator) {
        console.log('🔔 Service Worker is supported')
      } else {
        console.warn('⚠️ Service Worker is not supported')
      }
    } else {
      console.warn('⚠️ Browser does not support notifications')
      setPermission({
        permission: 'denied',
        isSupported: false
      })
    }
  }, [])

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.error('❌ Notifications not supported')
      return { permission: 'denied', isSupported: false }
    }

    // Verificar si ya tenemos permiso
    if (Notification.permission === 'granted') {
      console.log('✅ Permission already granted')
      return { permission: 'granted', isSupported: true }
    }

    try {
      console.log('🔔 Requesting permission...')
      const result = await Notification.requestPermission()
      console.log('🔔 Permission result:', result)
      
      setPermission({
        permission: result,
        isSupported: true
      })

      if (result === 'granted') {
        console.log('✅ Permission granted!')
        
        // Registrar Service Worker si está disponible
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js')
            console.log('✅ Service Worker registered:', registration)
          } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error)
          }
        }
      } else {
        console.warn('❌ Permission denied')
      }
      
      return { permission: result, isSupported: true }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error)
      return { permission: 'denied', isSupported: false }
    }
  }

  const showNotification = (options: NotificationOptions) => {
    console.log('🔔 Attempting to show notification:', options.title)
    
    if (!permission.isSupported) {
      console.error('❌ Notifications not supported')
      return null
    }

    if (permission.permission !== 'granted') {
      console.warn('❌ Permission not granted. Current:', permission.permission)
      return null
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: false,
        vibrate: [200, 100, 200]
      })

      console.log('✅ Notification shown successfully')
      
      // Auto-cerrar después de 5 segundos si no requiere interacción
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      return notification
    } catch (error) {
      console.error('❌ Error showing notification:', error)
      return null
    }
  }

  const showTaskNotification = (taskTitle: string, assignedToName: string) => {
    console.log('📋 Showing task notification for:', taskTitle)
    return showNotification({
      title: '📋 Nueva Tarea Asignada',
      body: `Se te ha asignado la tarea: "${taskTitle}"`,
      tag: `task-${Date.now()}`,
      requireInteraction: true
    })
  }

  const showProductNotification = (productName: string, type: 'low-stock' | 'expired' | 'expiring-soon') => {
    const messages = {
      'low-stock': `⚠️ El producto "${productName}" tiene bajo stock`,
      'expired': `⏰ El producto "${productName}" ha vencido`,
      'expiring-soon': `⏰ El producto "${productName}" vence pronto`
    }

    const titles = {
      'low-stock': '📦 Stock Bajo',
      'expired': '⚠️ Producto Vencido',
      'expiring-soon': '⏰ Producto por Vencer'
    }

    console.log(`📦 Showing product notification (${type}):`, productName)
    return showNotification({
      title: titles[type],
      body: messages[type],
      tag: `product-${type}-${Date.now()}`,
      requireInteraction: true
    })
  }

  return {
    permission,
    requestPermission,
    showNotification,
    showTaskNotification,
    showProductNotification
  }
}
