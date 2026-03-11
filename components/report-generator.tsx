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
                        ${reportData.finanzas.totalIngresos.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600">Ingresos</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-800">
                        ${reportData.finanzas.totalGastos.toFixed(2)}
                      </p>
                      <p className="text-sm text-red-600">Gastos</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <p className="text-xl font-bold text-purple-800">
                        ${reportData.finanzas.presupuesto.toFixed(2)}
                      </p>
                      <p className="text-sm text-purple-600">Presupuesto</p>
                    </div>
                  </div>
                </div>

                {/* Tareas */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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
                    <svg className="w-5 h-5 mr-2 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
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
