"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const router = useRouter()

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return Math.min(strength, 4)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setPasswordStrength(calculatePasswordStrength(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validaciones del lado del cliente
    if (!name.trim()) {
      setError("El nombre es requerido")
      setLoading(false)
      return
    }

    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres")
      setLoading(false)
      return
    }

    if (!email.trim()) {
      setError("El correo electrónico es requerido")
      setLoading(false)
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError("El formato del correo electrónico no es válido")
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError("La contraseña es requerida")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      setLoading(false)
      return
    }

    // Validar fortaleza de contraseña
    if (passwordStrength < 3) {
      setError("La contraseña debe ser más fuerte (incluir mayúsculas, números y caracteres especiales)")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Error al registrar usuario")
        return
      }

      // Guardar token y redirigir
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      // Check if user has households and active household
      try {
        const householdsResponse = await fetch("/api/households", {
          headers: { Authorization: `Bearer ${data.token}` },
          cache: "no-store",
        })

        if (householdsResponse.ok) {
          const householdsData = await householdsResponse.json()
          const households = Array.isArray(householdsData.households) ? householdsData.households : []
          const activeId = householdsData.activeHouseholdId

          if (!activeId || households.length === 0) {
            router.push("/select-household")
          } else {
            localStorage.setItem("activeHouseholdId", activeId)
            router.push("/dashboard")
          }
        } else {
          router.push("/select-household")
        }
      } catch (householdError) {
        console.error("Error checking households:", householdError)
        router.push("/select-household")
      }
    } catch (err) {
      console.error("Error de red o del servidor:", err)
      setError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const getPasswordStrengthText = () => {
    const texts = ["Muy débil", "Débil", "Regular", "Fuerte", "Muy fuerte"]
    return password === "" ? "Ingresa una contraseña" : texts[passwordStrength]
  }

  const getPasswordStrengthColor = () => {
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-purple-600"]
    return colors[Math.min(passwordStrength - 1, 3)] || "bg-gray-200 dark:bg-gray-700"
  }

  return (
    <div className="font-inter min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <button
        className="fixed top-4 right-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
        onClick={() => {
          document.documentElement.classList.toggle("dark")
          const isDark = document.documentElement.classList.contains("dark")
          localStorage.setItem("theme", isDark ? "dark" : "light")
        }}
      >
        <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      </button>

      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400/15 dark:bg-blue-400/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "-3s" }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-400/10 dark:bg-indigo-400/5 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "-1.5s" }}
        ></div>
      </div>

      <div className="relative min-h-screen flex">
        {/* Left Side - Registration Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
          {/* Mobile Logo */}
          <div className="lg:hidden absolute top-8 left-1/2 transform -translate-x-1/2 animate-scale-in">
            <div className="w-16 h-16 bg-purple-600/20 dark:bg-purple-600/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
          </div>

          <div className="w-full max-w-md animate-slide-up">
            {/* Header */}
            <div className="text-center mb-8 lg:mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">Crear Cuenta</h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg">Únete a miles de familias organizadas</p>
            </div>

            {/* Registration Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Name Field */}
              <div className="group">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-purple-600 transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-purple-600 transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-purple-600 transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,17,12,17z M15.1,8H8.9V6c0-1.71,1.39-3.1,3.1-3.1s3.1,1.39,3.1,3.1V8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-purple-600 transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {showPassword ? (
                        <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
                      ) : (
                        <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z" />
                      )}
                    </svg>
                  </button>
                </div>
                {/* Password Strength Indicator */}
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 w-1/4 rounded-full transition-colors duration-300 ${
                          level <= passwordStrength ? getPasswordStrengthColor() : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getPasswordStrengthText()}</p>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="group">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-purple-600 transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,17,12,17z M15.1,8H8.9V6c0-1.71,1.39-3.1,3.1-3.1s3.1,1.39,3.1,3.1V8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                    placeholder="Confirma tu contraseña"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-600 focus:ring-2 mt-1 bg-white dark:bg-gray-800"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Acepto los
                  <a href="#" className="text-purple-600 hover:text-indigo-600 font-medium transition-colors">
                    Términos de Servicio
                  </a>{" "}
                  y la{" "}
                  <a href="#" className="text-purple-600 hover:text-indigo-600 font-medium transition-colors">
                    Política de Privacidad
                  </a>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="white" viewBox="0 0 24 24">
                        <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z" />
                      </svg>
                      <span className="text-white">Crear Cuenta</span>
                    </>
                  )}
                </span>
              </button>

                          </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">
                ¿Ya tienes una cuenta?
                <Link
                  href="/login"
                  className="text-purple-600 hover:text-indigo-600 font-semibold transition-colors ml-1"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            {/* Back to Landing */}
            <div className="mt-4 text-center">
              <Link
                href="/"
                className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                </svg>
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-blue-600 to-blue-500 dark:from-gray-800 dark:via-gray-900 dark:to-black relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full blur-xl animate-pulse"></div>
            <div
              className="absolute bottom-32 left-16 w-24 h-24 bg-white/15 dark:bg-white/10 rounded-full blur-lg animate-pulse"
              style={{ animationDelay: "-2s" }}
            ></div>
            <div
              className="absolute top-1/2 right-10 w-16 h-16 bg-white/20 dark:bg-white/15 rounded-full blur-md animate-pulse"
              style={{ animationDelay: "-4s" }}
            ></div>
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
            <div className="text-center animate-fade-in">
              <div className="w-32 h-32 mx-auto mb-8 bg-white/20 dark:bg-white/10 rounded-full flex items-center justify-center shadow-2xl">
                <img src="https://cdn.discordapp.com/attachments/416734955440308244/1412109067308110126/homeapp-logo.png?ex=69e10b8d&is=69dfba0d&hm=ac1b6ace8c064e513f3a9d59aaba998e65852b9f78df1c57fbcd2c6d486ea9d5&" alt="HomeApp Logo" className="w-18 h-18" />
              </div>
              <h1 className="text-white text-4xl font-bold mb-6 leading-tight">
                Únete a la <span className="text-purple-300 dark:text-purple-300">Evolución</span> del Hogar
              </h1>
              <p className="text-xl text-blue-100 dark:text-blue-200 mb-8 leading-relaxed max-w-md">
                Más de - -  familias ya organizan su vida diaria con HomeApp
              </p>

              {/* Features List */}
              <div className="space-y-4 text-left max-w-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-400/20 dark:bg-purple-400/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-200 dark:text-purple-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </div>
                  <span className="text-blue-100 dark:text-blue-200">Gestión inteligente de tareas</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-400/20 dark:bg-purple-400/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-200 dark:text-purple-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </div>
                  <span className="text-blue-100 dark:text-blue-200">Colaboración familiar en tiempo real</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-400/20 dark:bg-purple-400/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-200 dark:text-purple-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </div>
                  <span className="text-blue-100 dark:text-blue-200">Recordatorios personalizados</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-400/20 dark:bg-purple-400/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-200 dark:text-purple-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </div>
                  <span className="text-blue-100 dark:text-blue-200">Acceso desde cualquier dispositivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
