-- MongoDB indexes for products collection
-- Run these commands in MongoDB shell or MongoDB Compass

-- Create index for householdId (most common query)
db.products.createIndex({ "householdId": 1 })

-- Create compound index for householdId and category (for filtered queries)
db.products.createIndex({ "householdId": 1, "category": 1 })

-- Create text index for product name search
db.products.createIndex({ "name": "text" })

-- Create compound index for householdId and name (for search within household)
db.products.createIndex({ "householdId": 1, "name": "text" })

-- Create index for expiry date (for expiration alerts)
db.products.createIndex({ "expiryDate": 1 })

-- Create compound index for householdId and expiry date
db.products.createIndex({ "householdId": 1, "expiryDate": 1 })

-- Create index for creation date (for sorting)
db.products.createIndex({ "createdAt": -1 })

-- Create compound index for householdId and creation date
db.products.createIndex({ "householdId": 1, "createdAt": -1 })

-- Create compound index for quantity and threshold comparison
db.products.createIndex({ "householdId": 1, "quantity": 1, "threshold": 1 })

-- Create sparse index for products with expiry dates only
db.products.createIndex({ "householdId": 1, "expiryDate": 1 }, { sparse: true })
