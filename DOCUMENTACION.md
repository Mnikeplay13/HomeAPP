# HomeApp - Documentación Completa

## 📋 Descripción General
HomeApp es una aplicación web de gestión doméstica familiar que permite organizar tareas, finanzas, inventario y menús de manera colaborativa.

## 🏗️ Arquitectura del Sistema

### Frontend (Next.js 15)
- **Framework**: Next.js 15 con React 19
- **Estilos**: Tailwind CSS + shadcn/ui
- **Estado**: React Hooks + Context
- **Tipado**: TypeScript

### Backend (API Routes)
- **Base de datos**: MongoDB Atlas
- **Autenticación**: JWT + bcrypt
- **API REST**: Next.js API Routes

## 📁 Estructura del Proyecto

```
app/
├── api/                    # Endpoints de la API
│   ├── auth/              # Autenticación (login, register)
│   ├── households/         # Gestión de hogares
│   ├── expenses/          # Finanzas y gastos
│   ├── tasks/             # Gestión de tareas
│   ├── products/          # Inventario de alacena
│   ├── menu/              # Planificación de menús
│   ├── notifications/     # Sistema de notificaciones
│   └── report/            # Generación de reportes PDF
├── dashboard/             # Panel principal
├── alacena/              # Gestión de inventario
├── finanzas/             # Gestión financiera
├── menu/                # Planificación de menús
├── todo/                # Gestión de tareas
└── layout.tsx           # Layout principal

components/
├── ui/                  # Componentes base shadcn/ui
├── auth/                # Componentes de autenticación
├── dashboard/           # Componentes del dashboard
├── report-generator.tsx  # Generador de PDFs
└── notification-button.tsx # Sistema de notificaciones
```

## 🔐 Sistema de Autenticación

### Flujo de Autenticación
1. **Registro**: Creación de cuenta con email/contraseña
2. **Login**: Validación de credenciales
3. **JWT Token**: Generación de token de 7 días
4. **Middleware**: Validación en rutas protegidas

### Endpoints de Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener datos del usuario actual

## 🏠 Gestión de Hogares

### Estructura de Hogar
```javascript
{
  _id: ObjectId,
  name: "Nombre del Hogar",
  description: "Descripción",
  ownerId: ObjectId,        // Administrador principal
  moderators: [ObjectId],   // Administradores secundarios
  members: [ObjectId],      // Todos los miembros
  inviteCode: "ABC123",    // Código de invitación
  imagen: "url_imagen",     // Imagen del hogar
  createdAt: Date,
  updatedAt: Date
}
```

### Roles de Usuario
- **dueño**: Acceso completo, puede eliminar hogar
- **admin**: Acceso casi completo, no puede eliminar hogar
- **miembro**: Acceso limitado a funciones básicas

## 📊 Módulos Principales

### 1. Dashboard (Panel Principal)
- **Estadísticas en tiempo real**
- **Accesos rápidos a módulos**
- **Notificaciones del sistema**
- **Generador de reportes PDF**

### 2. Finanzas
- **Registro de ingresos y gastos**
- **Categorización de transacciones**
- **Resúmenes mensuales**
- **Balance financiero**

### 3. Tareas (TODO)
- **Creación y asignación de tareas**
- **Estados: pendiente, en progreso, completada**
- **Prioridades: baja, media, alta**
- **Fechas de vencimiento**

### 4. Alacena (Inventario)
- **Control de stock de productos**
- **Categorización por ubicación**
- **Alertas de stock bajo**
- **Control de fechas de vencimiento**

### 5. Menú
- **Planificación semanal de comidas**
- **Organización por tipo (desayuno, almuerzo, cena)**
- **Seguimiento de platos completados**
- **Integración con inventario**

## 📈 Sistema de Reportes

### Generador de PDF
- **Reporte completo del hogar**
- **Datos de todos los módulos**
- **Exportación a PDF tamaño carta**
- **Modo claro forzado**

### Componentes del Reporte
1. **Información del hogar** con imagen
2. **Lista de miembros** y roles
3. **Resumen financiero** mensual
4. **Estado de tareas** por categoría
5. **Inventario de alacena** completo
6. **Estadísticas del menú**

## 🔔 Sistema de Notificaciones

### Tipos de Notificaciones
- **Tareas vencidas**: Alertas de plazos
- **Stock bajo**: Productos por agotarse
- **Vencimientos**: Productos próximos a vencer
- **Invitaciones**: Nuevos miembros en hogar

### Componente de Notificaciones
- **Badge con contador** de notificaciones no leídas
- **Dropdown** con lista de notificaciones
- **Acciones rápidas** desde notificación
- **Marca como leído** automático

## 🗄️ Base de Datos MongoDB

### Colecciones Principales

#### users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,      // Hash bcrypt
  households: [ObjectId], // Hogares del usuario
  createdAt: Date,
  updatedAt: Date
}
```

#### tasks
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  householdId: ObjectId,
  assignedTo: ObjectId,
  createdBy: ObjectId,
  status: "pending" | "in-progress" | "completed",
  priority: "low" | "medium" | "high",
  dueDate: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### expenses
```javascript
{
  _id: ObjectId,
  householdId: ObjectId,
  userId: ObjectId,
  mes: String,           // Formato "YYYY-MM"
  gastos: [{
    descripcion: String,
    monto: Number,
    categoria: String,
    fecha: Date
  }],
  ingresos: [{
    descripcion: String,
    monto: Number,
    categoria: String,
    fecha: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### products
```javascript
{
  _id: ObjectId,
  name: String,
  category: String,
  location: String,
  quantity: Number,
  minStock: Number,
  expiryDate: Date,
  householdId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

#### menu
```javascript
{
  _id: ObjectId,
  name: String,
  mealType: "desayuno" | "almuerzo" | "cena",
  date: Date,
  done: Boolean,
  householdId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Configuración y Deployment

### Variables de Entorno
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/homeapp
JWT_SECRET=clave_secreta_super_segura
NEXTAUTH_SECRET=clave_nextauth
NEXTAUTH_URL=http://localhost:3000
```

### Instalación
```bash
# Clonar repositorio
git clone <repositorio>
cd homeapp

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local

# Ejecutar desarrollo
npm run dev
```

### Deployment (Vercel)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático con cada push

## 🛡️ Seguridad

### Implementaciones
- **Hashing de contraseñas** con bcrypt (12 rounds)
- **JWT tokens** con expiración de 7 días
- **Validación de datos** en frontend y backend
- **Sanitización** de entradas de usuario
- **CORS** configurado para producción
- **Variables de entorno** para datos sensibles

### Middleware de Autenticación
```javascript
// Verificación de token en rutas protegidas
const token = request.headers.get('authorization')?.replace('Bearer ', '')
if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Adaptaciones
- **Dashboard**: Grid adaptable
- **Formularios**: Full width en móvil
- **Tablas**: Scroll horizontal en móvil
- **Menús**: Collapsible en móvil

## 🚀 Rendimiento y Optimización

### Prácticas Implementadas
- **Lazy loading** de componentes
- **Optimización de imágenes** con Next.js Image
- **Caching** de respuestas API
- **Bundle splitting** automático
- **Tree shaking** de dependencias

### Métricas
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔄 Flujo de Trabajo Típico

### 1. Registro y Configuración
1. Usuario crea cuenta
2. Crea o se une a un hogar
3. Invita a familiares con código

### 2. Uso Diario
1. Consulta dashboard para resumen
2. Gestiona tareas pendientes
3. Registra gastos/ingresos
4. Actualiza inventario
5. Planifica menús

### 3. Reportes
1. Genera reporte mensual PDF
2. Revisa estadísticas
3. Toma decisiones basadas en datos

## 🛠️ Tecnologías Clave

### Frontend
- **Next.js 15**: Framework React con SSR
- **React 19**: Librería de UI
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Framework de CSS
- **shadcn/ui**: Componentes de UI
- **Lucide React**: Iconos
- **Recharts**: Gráficos y estadísticas

### Backend
- **Node.js**: Runtime JavaScript
- **MongoDB**: Base de datos NoSQL
- **Mongoose**: ODM para MongoDB
- **JWT**: Autenticación
- **bcrypt**: Hashing de contraseñas

### PDF Generation
- **jsPDF**: Generación de PDFs
- **html2canvas**: Captura de HTML a imagen

## 📞 Soporte y Mantenimiento

### Monitoreo
- **Logs de errores** en consola
- **Métricas de rendimiento** con Vercel Analytics
- **Uptime monitoring** recomendado

### Actualizaciones
- **Dependencias**: Actualizar mensualmente
- **Seguridad**: Revisar vulnerabilidades
- **Features**: Desarrollo iterativo

---

**HomeApp v1.0** - Gestión Inteligente del Hogar
*Última actualización: Marzo 2025*
