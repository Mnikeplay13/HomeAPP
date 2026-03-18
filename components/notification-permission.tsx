'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationPermission() {
  const { permission, requestPermission } = useNotifications()
  const [isLoading, setIsLoading] = useState(false)
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)

  const handleRequestPermission = async () => {
    setIsLoading(true)
    await requestPermission()
    setIsLoading(false)
  }

  if (!permission.isSupported) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-lg z-50 max-w-sm">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <strong>❌ Notificaciones no soportadas</strong>
              <br />
              Tu navegador no soporta notificaciones de escritorio. Por favor, usa un navegador moderno como Chrome, Firefox o Edge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (permission.permission === 'granted') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>🔔 Activa las notificaciones</strong>
            <br />
            Recibe alertas de tareas y productos directamente en tu escritorio.
          </p>
          <div className="mt-3 space-y-2">
            <button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Activando...' : 'Activar Notificaciones'}
            </button>
            
            <button
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="w-full text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              {showTroubleshoot ? 'Ocultar ayuda' : '¿No recibes notificaciones?'}
            </button>
            
            {showTroubleshoot && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                <p className="font-semibold mb-1">🔧 Solución de problemas:</p>
                <ul className="space-y-1">
                  <li>• Verifica que el navegador sea Chrome, Firefox o Edge</li>
                  <li>• Asegúrate de estar en https:// o localhost</li>
                  <li>• Revisa la configuración de notificaciones de Windows</li>
                  <li>• No uses modo incógnito</li>
                  <li>• Reinicia el navegador después de activar</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
