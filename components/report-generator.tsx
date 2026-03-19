"use client"

import { useState } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface ReportData {
  hogar: {
    nombre: string
    imagen: string | null
    miembros: Array<{
      name: string
      email: string
      role: string
    }>
    totalMiembros: number
  }
  finanzas: {
    mes: string
    totalGastos: number
    totalIngresos: number
    balance: number
    cantidadGastos: number
    cantidadIngresos: number
    presupuesto: number
  }
  tareas: {
    completadas: number
    pendientes: number
    vencidas: number
    total: number
  }
  alacena: {
    totalProductos: number
    stockNormal: number
    stockBajo: number
    vencidos: number
    porVencer: number
  }
  menu: {
    platosPendientes: number
    platosCompletados: number
    totalPlatos: number
  }
  fechaReporte: string
  periodo: string
}

interface ReportGeneratorProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReportGenerator({ isOpen, onClose }: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/report", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al obtener los datos del reporte")
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    if (!reportData) return

    try {
      const element = document.getElementById("report-content")
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 794, // Ancho de página carta en puntos (72 dpi)
        height: 1122, // Alto de página carta en puntos (72 dpi)
        windowWidth: 794,
        windowHeight: 1122,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      })
      
      const imgWidth = 216 // Ancho de página carta en mm
      const pageHeight = 279 // Alto de página carta en mm
      
      // Calcular la altura de la imagen para que quepa en una página
      const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, pageHeight - 10) // Dejar 5mm margen arriba y abajo
      
      // Centrar horizontalmente y verticalmente
      const x = 15
      const y = (pageHeight - imgHeight) / 2

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight)

      const fileName = `reporte-hogar-${reportData.hogar.nombre}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (err) {
      setError("Error al generar el PDF")
      console.error("Error generating PDF:", err)
    }
  }

  const handleGenerateReport = async () => {
    await fetchReportData()
  }

  const handleDownloadPDF = async () => {
    if (!reportData) {
      await handleGenerateReport()
    }
    setTimeout(() => {
      generatePDF()
    }, 500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Generar Reporte del Hogar
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {!reportData && !loading && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v2a2 2 0 002 2h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M9 17l6-6m-6 6l6 6" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Generar Reporte
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Obtén un resumen completo de todos los módulos de tu hogar
              </p>
              <button
                onClick={handleGenerateReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Generar Reporte
              </button>
            </div>
          )}

          {reportData && (
            <>
              <div className="mb-6 flex justify-end space-x-3">
                <button
                  onClick={handleGenerateReport}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Actualizar Datos
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar PDF
                </button>
              </div>

              <div id="report-content" className="bg-white p-6 rounded-lg" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                {/* Header */}
                <div className="text-center mb-6 border-b border-gray-200 pb-4 relative">
                  {reportData.hogar.imagen && (
                    <img 
                      src={reportData.hogar.imagen} 
                      alt="Logo del hogar" 
                      className="absolute top-0 right-0 w-12 h-12 rounded-lg object-cover border-2 border-gray-300"
                    />
                  )}
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Reporte del Hogar
                  </h1>
                  <p className="text-lg text-gray-600 mb-1">
                    {reportData.hogar.nombre}
                  </p>
                  <p className="text-gray-500">
                    Período: {reportData.periodo}
                  </p>
                  <p className="text-sm text-gray-400">
                    Generado el: {new Date(reportData.fechaReporte).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Miembros del Hogar */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Miembros del Hogar ({reportData.hogar.totalMiembros})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reportData.hogar.miembros.map((miembro, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{miembro.name}</p>
                            <p className="text-sm text-gray-600">{miembro.email}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            miembro.role === 'dueño' 
                              ? 'bg-purple-100 text-purple-800'
                              : miembro.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {miembro.role.charAt(0).toUpperCase() + miembro.role.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Finanzas */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resumen Financiero - {reportData.finanzas.mes}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-800">
                        {typeof reportData.finanzas.totalIngresos === "number" ? `$${reportData.finanzas.totalIngresos.toFixed(2)}` : "$0.00"}
                      </p>
                      <p className="text-sm text-green-600">Ingresos</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-800">
                        {typeof reportData.finanzas.totalGastos === "number" ? `$${reportData.finanzas.totalGastos.toFixed(2)}` : "$0.00"}
                      </p>
                      <p className="text-sm text-red-600">Gastos</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-purple-800">
                        {typeof reportData.finanzas.presupuesto === "number" ? `$${reportData.finanzas.presupuesto.toFixed(2)}` : "$0.00"}
                      </p>
                      <p className="text-sm text-purple-600">Presupuesto</p>
                    </div>
                  </div>
                </div>

                {/* Tareas */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Estado de Tareas
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-800">
                        {reportData.tareas.completadas}
                      </p>
                      <p className="text-sm text-green-600">Completadas</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-yellow-800">
                        {reportData.tareas.pendientes}
                      </p>
                      <p className="text-sm text-yellow-600">Pendientes</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-800">
                        {reportData.tareas.vencidas}
                      </p>
                      <p className="text-sm text-red-600">Vencidas</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-800">
                        {reportData.tareas.total}
                      </p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                </div>

                {/* Alacena */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M22,1H2A1,1,0,0,0,1,2V22a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1V2A1,1,0,0,0,22,1ZM19,9.667h2v4.666H19Zm2-2H19V3h2Zm-4,7.666V17H11V3h6ZM3,3H9V17H3ZM3,19H17v2H3Zm18,2H19V16.333h2ZM8,9v2a1,1,0,0,1-2,0V9A1,1,0,0,1,8,9Zm4,2V9a1,1,0,0,1,2,0v2a1,1,0,0,1-2,0Z" />
                    </svg>
                    Estado de la Alacena
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-800">
                        {reportData.alacena.totalProductos}
                      </p>
                      <p className="text-sm text-blue-600">Total</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-800">
                        {reportData.alacena.stockNormal}
                      </p>
                      <p className="text-sm text-green-600">Stock Normal</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-yellow-800">
                        {reportData.alacena.stockBajo}
                      </p>
                      <p className="text-sm text-yellow-600">Stock Bajo</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-800">
                        {reportData.alacena.vencidos}
                      </p>
                      <p className="text-sm text-red-600">Vencidos</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-orange-800">
                        {reportData.alacena.porVencer}
                      </p>
                      <p className="text-sm text-orange-600">Por Vencer</p>
                    </div>
                  </div>
                </div>

                {/* Menú */}
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 130 130">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M97.34,0.74c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L81.98,24.1l-0.03,0.04 c-2.29,2.77-3.86,5.33-4.56,7.67c-0.62,2.07-0.53,3.95,0.39,5.59c0.49,0.88,0.33,1.96-0.32,2.67l0,0l-8.89,9.62 c-0.87-0.95-1.56-1.72-2.02-2.22c-0.21-0.28-0.45-0.55-0.7-0.81l-0.02,0.02c-0.12-0.13-0.25-0.25-0.38-0.37l7.6-8.23 c-0.89-2.38-0.88-4.91-0.06-7.6c0.88-2.92,2.75-6.03,5.44-9.27c0.06-0.08,0.11-0.16,0.18-0.23L97.32,0.72L97.34,0.74L97.34,0.74z M57.13,55.01c-0.84-0.94-0.76-2.39,0.18-3.23c0.94-0.84,2.39-0.76,3.23,0.18c9.41,10.54,38.5,41.73,46.56,53.39 c10.63,15.05-5.83,19.79-11.29,14.31c-13.64-13.19-42.6-46.82-55.33-61.08c-4.58,1.94-9.03,2.24-13.5,0.96 c-4.81-1.37-9.52-4.58-14.3-9.51l-0.06-0.06c-3.64-3.84-6.49-7.63-8.55-11.38c-2.11-3.86-3.4-7.68-3.86-11.47 c-0.49-4.08-0.11-7.88,0.99-11.25c1.29-3.96,3.58-7.31,6.58-9.8c3.02-2.5,6.73-4.12,10.87-4.62c3.44-0.41,7.19-0.06,11.07,1.21 c5.37,1.75,11.63,6.1,16.82,11.68c3.83,4.11,7.11,8.92,9.06,13.87c2.03,5.16,2.65,10.5,1.02,15.5c-0.96,2.96-2.7,5.74-5.4,8.25 c-0.93,0.86-2.37,0.8-3.23-0.12c-0.86-0.93-0.8-2.37,0.12-3.23c2.09-1.95,3.43-4.08,4.16-6.33c1.26-3.87,0.73-8.16-0.93-12.38 c-1.74-4.42-4.69-8.74-8.15-12.45c-4.68-5.02-10.23-8.91-14.91-10.44c-3.21-1.04-6.28-1.34-9.09-1c-3.26,0.4-6.18,1.65-8.51,3.6 c-2.34,1.95-4.13,4.58-5.16,7.71c-0.89,2.73-1.2,5.87-0.79,9.26c0.39,3.2,1.5,6.47,3.32,9.81c1.91,3.43,4.53,6.9,7.9,10.45 l0.02,0.03c4.22,4.35,8.27,7.15,12.28,8.29c3.79,1.08,7.65,0.66,11.68-1.35c0.92-0.53,2.11-0.35,2.84,0.47 c12.42,13.91,42.63,48.92,56.01,61.89c5.81,2.37,9.03-0.55,6.25-5.7C100.7,102.43,63.5,62.17,57.13,55.01L57.13,55.01L57.13,55.01z M45.07,75.12l-29.16,31.55c-0.06,0.06-0.11,0.12-0.18,0.18c-4.26,4.6,3.28,11.3,7.96,6.82l28.32-30.65l3.04,3.45l-28.1,30.41l0,0 c-0.06,0.07-0.12,0.13-0.2,0.2c-1.68,1.41-3.37,2.33-5.08,2.71c-1.76,0.4-3.49,0.22-5.15-0.56c-0.28-0.11-0.54-0.25-0.77-0.46 l-4.03-3.73l0,0c-0.06-0.06-0.12-0.11-0.18-0.18c-1.56-1.8-2.3-3.72-2.1-5.75c0.19-1.92,1.21-3.79,3.14-5.59l29.44-31.86 L45.07,75.12L45.07,75.12z M75.63,57.46l1.73-1.87c0.86-0.93,2.31-0.99,3.23-0.13s0.99,2.3,0.13,3.23l-2,2.16L75.63,57.46 L75.63,57.46z M104.45,7.43c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L91.4,28.3c-0.86,0.93-2.3,0.99-3.23,0.13 c-0.93-0.86-0.99-2.3-0.13-3.23L104.45,7.43L104.45,7.43L104.45,7.43z M111.55,14c0.86-0.93,2.3-0.99,3.23-0.13 c0.93,0.86,0.99,2.3,0.13,3.23L98.51,34.86c-0.86,0.93-2.3,0.99-3.23,0.13c-0.93-0.86-0.99-2.3-0.13-3.23L111.55,14L111.55,14 L111.55,14z M118.91,20.83c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.31,0.13,3.23L103.55,44.2c-0.07,0.07-0.14,0.13-0.21,0.2 c-4.26,4.1-8.33,6.47-12.22,7.14c-4.22,0.73-8.09-0.47-11.64-3.57c-0.95-0.83-1.04-2.28-0.22-3.22c0.83-0.95,2.28-1.04,3.22-0.22 c2.45,2.14,5.07,2.98,7.84,2.49c2.98-0.51,6.26-2.48,9.84-5.93l0.02-0.02l18.71-20.25L118.91,20.83L118.91,20.83z" />
                    </svg>
                    Estado del Menú
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-800">
                        {reportData.menu.platosCompletados}
                      </p>
                      <p className="text-sm text-green-600">Completados</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-yellow-800">
                        {reportData.menu.platosPendientes}
                      </p>
                      <p className="text-sm text-yellow-600">Pendientes</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-800">
                        {reportData.menu.totalPlatos}
                      </p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
