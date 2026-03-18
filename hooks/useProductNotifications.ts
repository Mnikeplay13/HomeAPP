import { useEffect } from 'react'
import { useNotifications } from './useNotifications'

interface Product {
  _id: string
  name: string
  quantity: number
  quantityUnit: string
  threshold: number
  thresholdUnit: string
  expiryDate?: string
  purchaseDate?: string
}

export function useProductNotifications(products: Product[]) {
  const { showProductNotification } = useNotifications()

  useEffect(() => {
    const checkProducts = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Resetear a inicio del día

      products.forEach(product => {
        // Verificar stock bajo
        if (product.threshold && product.quantity <= product.threshold) {
          showProductNotification(product.name, 'low-stock')
        }

        // Verificar productos vencidos o próximos a vencer
        if (product.expiryDate) {
          const expiryDate = new Date(product.expiryDate)
          expiryDate.setHours(0, 0, 0, 0) // Resetear a inicio del día
          
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          // Notificar si está vencido o vence en 3 días o menos
          if (daysUntilExpiry <= 0) {
            showProductNotification(product.name, 'expired')
          } else if (daysUntilExpiry <= 3) {
            showProductNotification(product.name, 'expiring-soon')
          }
        }
      })
    }

    // Verificar productos inmediatamente
    checkProducts()

    // Configurar verificación periódica (cada hora)
    const interval = setInterval(checkProducts, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [products, showProductNotification])

  return null
}
