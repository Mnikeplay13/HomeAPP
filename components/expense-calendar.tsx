"use client"

import { useState } from "react"

interface Expense {
  fecha: string
  monto: number
}

interface ExpenseCalendarProps {
  expenses: Expense[]
  ingresos?: Expense[]
  onDeleteExpense?: (fecha: string, monto: number, tipo?: "gasto" | "ingreso") => void
  onEditExpense?: (fecha: string, montoAnterior: number, montoNuevo: number, tipo?: "gasto" | "ingreso") => void
}

export default function ExpenseCalendar({ expenses, ingresos = [], onDeleteExpense, onEditExpense }: ExpenseCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<{ fecha: string; monto: number; tipo: "gasto" | "ingreso" } | null>(null)
  const [editAmount, setEditAmount] = useState("")

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const expensesByDay: { [key: number]: Expense[] } = {}
  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.fecha + "T00:00:00")
    const day = expenseDate.getDate()
    if (!expensesByDay[day]) expensesByDay[day] = []
    expensesByDay[day].push(expense)
  })

  const ingresosByDay: { [key: number]: Expense[] } = {}
  ingresos.forEach((ing) => {
    const d = new Date(ing.fecha + "T00:00:00")
    const day = d.getDate()
    if (!ingresosByDay[day]) ingresosByDay[day] = []
    ingresosByDay[day].push(ing)
  })

  const getTotalGastosForDay = (day: number) =>
    (expensesByDay[day] || []).reduce((sum, e) => sum + e.monto, 0)
  const getTotalIngresosForDay = (day: number) =>
    (ingresosByDay[day] || []).reduce((sum, e) => sum + e.monto, 0)

  const getDayColor = (day: number) => {
    const gastos = getTotalGastosForDay(day)
    const ingresosD = getTotalIngresosForDay(day)
    if (gastos === 0 && ingresosD === 0) return ""
    if (ingresosD > gastos) return "green"
    if (gastos > ingresosD) return "red"
    return "yellow"
  }

  // Generate calendar days
  const calendarDays = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  const hasActivityOnDay = (day: number) =>
    (expensesByDay[day] && expensesByDay[day].length > 0) || (ingresosByDay[day] && ingresosByDay[day].length > 0)

  const handleDayClick = (day: number) => {
    if (hasActivityOnDay(day)) {
      setSelectedDay(selectedDay === day ? null : day)
    }
  }

  const handleEditClick = (item: Expense, tipo: "gasto" | "ingreso") => {
    setEditingItem({ ...item, tipo })
    setEditAmount(item.monto.toString())
  }

  const handleSaveEdit = () => {
    if (editingItem && onEditExpense && editAmount) {
      onEditExpense(editingItem.fecha, editingItem.monto, Number.parseFloat(editAmount), editingItem.tipo)
      setEditingItem(null)
      setEditAmount("")
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditAmount("")
  }

  const getTotalForDay = (day: number) => getTotalGastosForDay(day) - getTotalIngresosForDay(day)

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <h6 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
        {monthNames[currentMonth]} {currentYear}
      </h6>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((dayName) => (
          <div key={dayName} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 p-2">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const color = day ? getDayColor(day) : ""
          const ringClass =
            color === "green"
              ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
              : color === "red"
                ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                : color === "yellow"
                  ? "ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  : ""
          return (
            <div
              key={index}
              onClick={() => day && handleDayClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center p-1 rounded-lg text-sm
                ${day ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600" : ""}
                ${day && ringClass}
                ${day === currentDate.getDate() && currentMonth === new Date().getMonth() ? "ring-2 ring-blue-500" : ""}
                ${selectedDay === day ? "ring-4 ring-blue-600" : ""}
              `}
            >
              {day && (
                <>
                  <span className="text-gray-800 dark:text-white font-medium">{day}</span>
                  {hasActivityOnDay(day) && (
                    <div className="flex flex-col items-center mt-1">
                      <span className={`text-xs font-semibold ${
                        color === "green"
                          ? "text-green-600 dark:text-green-400"
                          : color === "red"
                            ? "text-red-600 dark:text-red-400"
                            : "text-yellow-600 dark:text-yellow-400"
                      }`}>
                        ${(getTotalIngresosForDay(day) - getTotalGastosForDay(day)).toFixed(0)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay && hasActivityOnDay(selectedDay) && (
        <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-3">
            Día {selectedDay} — Gastos: ${getTotalGastosForDay(selectedDay).toFixed(2)} | Ingresos: ${getTotalIngresosForDay(selectedDay).toFixed(2)} | Balance: ${(getTotalIngresosForDay(selectedDay) - getTotalGastosForDay(selectedDay)).toFixed(2)}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(expensesByDay[selectedDay] || []).map((expense, idx) => (
              <div key={`g-${idx}`} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">Gasto: ${expense.monto.toFixed(2)}</span>
                <div className="flex items-center space-x-2">
                  {editingItem?.fecha === expense.fecha && editingItem?.monto === expense.monto && editingItem?.tipo === "gasto" ? (
                    <>
                      <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-20 px-2 py-1 border rounded text-sm" />
                      <button onClick={handleSaveEdit} className="p-1 text-green-600" title="Guardar">✓</button>
                      <button onClick={handleCancelEdit} className="p-1 text-gray-600" title="Cancelar">✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(expense, "gasto")} className="p-1 text-blue-600" title="Editar">✎</button>
                      <button onClick={() => onDeleteExpense?.(expense.fecha, expense.monto, "gasto")} className="p-1 text-red-600" title="Eliminar">🗑</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(ingresosByDay[selectedDay] || []).map((ing, idx) => (
              <div key={`i-${idx}`} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">Ingreso: ${ing.monto.toFixed(2)}</span>
                <div className="flex items-center space-x-2">
                  {editingItem?.fecha === ing.fecha && editingItem?.monto === ing.monto && editingItem?.tipo === "ingreso" ? (
                    <>
                      <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-20 px-2 py-1 border rounded text-sm" />
                      <button onClick={handleSaveEdit} className="p-1 text-green-600" title="Guardar">✓</button>
                      <button onClick={handleCancelEdit} className="p-1 text-gray-600" title="Cancelar">✕</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditClick(ing, "ingreso")} className="p-1 text-blue-600" title="Editar">✎</button>
                      <button onClick={() => onDeleteExpense?.(ing.fecha, ing.monto, "ingreso")} className="p-1 text-red-600" title="Eliminar">🗑</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 text-center flex flex-wrap justify-center gap-4">
        <span className="inline-flex items-center">
          <span className="w-3 h-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded mr-1"></span>
          Más ingresos
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded mr-1"></span>
          Más gastos
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded mr-1"></span>
          Igual
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded mr-1"></span>
          Hoy
        </span>
      </div>
    </div>
  )
}
