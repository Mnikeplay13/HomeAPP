import { useEffect, useState } from 'react'
import { useNotifications } from './useNotifications'

interface NotificationItem {
  _id: string
  id: string
  title: string
  message: string
  body: string
  type: 'task' | 'product-low-stock' | 'product-expired' | 'product-expiring' | 'household-join'
  timestamp: number
  read: boolean
  createdAt?: string
}

export function useCentralNotifications() {
  const { showNotification } = useNotifications()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [lastNotifications, setLastNotifications] = useState<Set<string>>(new Set())
  const [hasCheckedProducts, setHasCheckedProducts] = useState(false)

  // Verificar productos al entrar (solo una vez por sesión)
  useEffect(() => {
    const checkProductsOnEntry = async () => {
      if (hasCheckedProducts) return
      
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch('/api/notifications/check-products', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Productos verificados:', data.notificationsCreated, 'notificaciones creadas')
          setHasCheckedProducts(true)
        }
      } catch (error) {
        console.error('Error verificando productos:', error)
      }
    }

    checkProductsOnEntry()
  }, [hasCheckedProducts])

  // Cargar notificaciones desde la API y mostrarlas como notificaciones del navegador
  const fetchAndShowNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const apiNotifications = data.notifications || []
        
        // Mostrar notificaciones no leídas como notificaciones del navegador
        apiNotifications.forEach((notif: any) => {
          if (!notif.read && !notif.shownOnce) {
            showNotification({
              title: notif.title,
              body: notif.message,
              tag: notif._id,
              requireInteraction: true
            })
          }
        })

        setNotifications(apiNotifications)
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }

  // Cargar notificaciones periódicamente
  useEffect(() => {
    fetchAndShowNotifications()
    
    // Verificar cada 30 segundos
    const interval = setInterval(fetchAndShowNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const addNotification = (title: string, body: string, type: NotificationItem['type']) => {
    const id = `${type}-${Date.now()}`
    const newNotification: NotificationItem = {
      _id: id,
      id,
      title,
      message: body,
      body,
      type,
      timestamp: Date.now(),
      read: false,
      createdAt: new Date().toISOString()
    }

    // Evitar duplicados por tipo y contenido
    const notificationKey = `${type}-${title}-${body}`
    if (!lastNotifications.has(notificationKey)) {
      setLastNotifications(prev => new Set(prev).add(notificationKey))
      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]) // Máximo 50 notificaciones
      
      // Mostrar notificación del navegador
      showNotification({
        title,
        body,
        tag: id,
        requireInteraction: true
      })
    }
  }

  const notifyTaskAssigned = (taskTitle: string, assignedToName: string) => {
    addNotification(
      '📋 Nueva Tarea Asignada',
      `Se te ha asignado la tarea: "${taskTitle}"`,
      'task'
    )
  }

  const notifyProductLowStock = (productName: string) => {
    addNotification(
      '📦 Stock Bajo',
      `El producto "${productName}" tiene bajo stock`,
      'product-low-stock'
    )
  }

  const notifyProductExpired = (productName: string) => {
    addNotification(
      '⚠️ Producto Vencido',
      `El producto "${productName}" ha vencido`,
      'product-expired'
    )
  }

  const notifyProductExpiring = (productName: string, days: number) => {
    addNotification(
      '⏰ Producto por Vencer',
      `El producto "${productName}" vence en ${days} día${days === 1 ? '' : 's'}`,
      'product-expiring'
    )
  }

  const notifyHouseholdJoined = (householdName: string) => {
    addNotification(
      '🏠 Nuevo Hogar',
      `Te has unido al hogar: "${householdName}"`,
      'household-join'
    )
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
  }

  const clearAll = async () => {
    try {
      // Limpiar notificaciones del servidor
      const token = localStorage.getItem('token')
      if (token) {
        await fetch('/api/notifications/clear', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
      
      // Limpiar estado local
      setNotifications([])
      setLastNotifications(new Set())
    } catch (error) {
      console.error('Error limpiando notificaciones:', error)
      // Limpiar estado local aunque falle la API
      setNotifications([])
      setLastNotifications(new Set())
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    addNotification,
    fetchAndShowNotifications,
    notifyTaskAssigned,
    notifyProductLowStock,
    notifyProductExpired,
    notifyProductExpiring,
    notifyHouseholdJoined,
    markAsRead,
    clearAll,
    hasCheckedProducts
  }
}
