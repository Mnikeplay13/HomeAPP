import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, toZonedTime } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha a la zona horaria de Venezuela (America/Caracas).
 * @param date Fecha en formato Date, string o number
 * @param formato Formato de salida (por defecto: 'yyyy-MM-dd HH:mm:ss')
 * @returns Fecha formateada en hora Venezuela
 */
export function formatVenezuelaDate(date: Date | string | number, formato = 'yyyy-MM-dd HH:mm:ss') {
  const timeZone = 'America/Caracas'
  const zonedDate = toZonedTime(new Date(date), timeZone)
  return format(zonedDate, formato, { timeZone })
}
