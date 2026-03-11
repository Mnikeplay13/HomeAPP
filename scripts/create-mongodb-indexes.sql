-- Este archivo contiene los comandos MongoDB para crear índices
-- Ejecutar estos comandos en MongoDB Compass o en la consola de MongoDB

-- Crear índices para la colección de usuarios
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "createdAt": 1 })

-- Crear índices para la colección de hogares
db.households.createIndex({ "createdBy": 1 })
db.households.createIndex({ "members.userId": 1 })
db.households.createIndex({ "inviteCode": 1 }, { unique: true, sparse: true })

-- Crear índices para la colección de tareas
db.tasks.createIndex({ "householdId": 1 })
db.tasks.createIndex({ "assignedTo": 1 })
db.tasks.createIndex({ "createdBy": 1 })
db.tasks.createIndex({ "status": 1 })
db.tasks.createIndex({ "dueDate": 1 })
db.tasks.createIndex({ "createdAt": 1 })

-- Índices compuestos para consultas comunes
db.tasks.createIndex({ "householdId": 1, "status": 1 })
db.tasks.createIndex({ "assignedTo": 1, "status": 1 })
db.tasks.createIndex({ "householdId": 1, "dueDate": 1 })
