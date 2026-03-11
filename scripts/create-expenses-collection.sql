-- MongoDB collection setup script for expenses
-- Este script es para referencia de la estructura de datos en MongoDB
-- MongoDB es NoSQL, por lo que no usa SQL tradicional, pero aquí está la estructura equivalente

/*
Estructura de datos para la colección 'expenses' en MongoDB:

{
  "_id": ObjectId("..."),
  "userId": "usuario123",
  "householdId": "familia123", 
  "mes": "2025-08",
  "gastos": [
    {
      "fecha": "2025-08-01",
      "monto": 50.00
    },
    {
      "fecha": "2025-08-02", 
      "monto": 25.50
    }
  ],
  "createdAt": ISODate("2025-08-01T00:00:00Z"),
  "updatedAt": ISODate("2025-08-01T00:00:00Z")
}

Índices recomendados para optimizar consultas:
- { "userId": 1, "householdId": 1, "mes": 1 } (índice compuesto)
- { "householdId": 1, "mes": 1 } (para consultas de hogar)
- { "createdAt": 1 } (para consultas por fecha de creación)

Comandos MongoDB para crear los índices:
db.expenses.createIndex({ "userId": 1, "householdId": 1, "mes": 1 })
db.expenses.createIndex({ "householdId": 1, "mes": 1 })
db.expenses.createIndex({ "createdAt": 1 })
*/
