<<<<<<< HEAD
# HomeApp - Gestión Inteligente del Hogar

Una aplicación web moderna para organizar y gestionar las tareas domésticas de manera colaborativa con tu familia.

## 🚀 Características

- **Sistema de autenticación** completo con registro y login
- **Dashboard interactivo** con estadísticas en tiempo real
- **Gestión de tareas** con asignación y seguimiento
- **Colaboración familiar** para coordinar actividades
- **Base de datos MongoDB** para almacenamiento seguro
- **Interfaz responsive** optimizada para todos los dispositivos

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Base de datos**: MongoDB Atlas
- **Autenticación**: JWT + bcrypt
- **Deployment**: Vercel (recomendado)

## 📦 Instalación

1. **Clona el repositorio**:
   \`\`\`bash
   git clone <tu-repositorio>
   cd homeapp
   \`\`\`

2. **Instala las dependencias**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Configura las variables de entorno**:
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`
   
   Edita `.env.local` con tus credenciales:
   \`\`\`env
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/homeapp
   JWT_SECRET=tu_clave_secreta_muy_segura_aqui
   \`\`\`

4. **Configura MongoDB Atlas**:
   - Crea una cuenta gratuita en [MongoDB Atlas](https://cloud.mongodb.com/)
   - Crea un nuevo cluster
   - Obtén tu connection string
   - Reemplaza `usuario`, `password` y `cluster` en la URI

5. **Ejecuta el proyecto**:
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Abre tu navegador**:
   Ve a `http://localhost:3000`

## 🗄️ Estructura de la Base de Datos

### Colección: users
\`\`\`javascript
{
  _id: ObjectId,
  name: "Juan Pérez",
  email: "juan@email.com",
  password: "hash_bcrypt",
  role: "member" | "admin",
  households: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Colección: households
\`\`\`javascript
{
  _id: ObjectId,
  name: "Casa Familia Pérez",
  description: "Nuestro hogar",
  adminId: ObjectId,
  members: [ObjectId],
  inviteCode: "ABC123",
  createdAt: Date,
  updatedAt: Date
}
\`\`\`

### Colección: tasks
\`\`\`javascript
{
  _id: ObjectId,
  title: "Lavar los platos",
  description: "Lavar todos los platos después de la cena",
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
\`\`\`

## 🔐 Seguridad

- **Contraseñas hasheadas** con bcrypt (12 rounds)
- **JWT tokens** con expiración de 7 días
- **Validación de datos** en frontend y backend
- **Sanitización** de respuestas de usuario
- **Variables de entorno** para credenciales sensibles

## 🚀 Deployment

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Deploy automático con cada push

### Variables de entorno en producción:
\`\`\`env
MONGODB_URI=tu_mongodb_uri_de_produccion
JWT_SECRET=clave_secreta_super_segura_para_produccion
\`\`\`

## 📱 Funcionalidades

### ✅ Implementadas
- [x] Sistema de registro y login
- [x] Dashboard con estadísticas
- [x] Autenticación JWT
- [x] Base de datos MongoDB
- [x] Interfaz responsive

### 🔄 En desarrollo
- [ ] Gestión de hogares
- [ ] Sistema de tareas CRUD
- [ ] Invitaciones familiares
- [ ] Notificaciones en tiempo real
- [ ] Reportes y estadísticas avanzadas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 📞 Contacto

- **Email**: support@homeapp.com
- **Website**: https://homeapp.vercel.app
- **GitHub**: https://github.com/tu-usuario/homeapp

---

¡Gracias por usar HomeApp! 🏠✨
=======
# HomeAPP
>>>>>>> db731e43fb8d192d6135f7b5fd1315c8208cc7da
