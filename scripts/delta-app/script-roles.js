/**
 * Delta Project — MongoDB Governance Setup (Cluster 2: App)
 * * Este script cria as Custom Roles para o cluster do APLICATIVO (db_delta_app).
 * Executar com usuário admin no banco 'admin'.
 */

use("admin");

// 1. Service Account da API (CRUD total no App + Chatbot)
db.createRole(
  {
    role: "role_api_service",
    privileges: [
      {
        resource: { db: "db_delta_app", collection: "" },
        actions: ["find", "insert", "update", "delete"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_api_service' criada (App CRUD)");

// 2. Dev Back-end — Leitura para depuração de chats e preferências
db.createRole(
  {
    role: "role_dev_backend",
    privileges: [
      {
        resource: { db: "db_delta_app", collection: "" },
        actions: ["find"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_dev_backend' criada (Read-Only)");

// 3. DevOps Engineer — Infraestrutura, Índices e TTLs do Chat
db.createRole(
  {
    role: "role_devops_engineer",
    privileges: [
      {
        resource: { db: "db_delta_app", collection: "" },
        actions: ["find", "createIndex", "dropIndex", "collMod", "dbStats", "collStats"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_devops_engineer' criada (Infra & Índices)");

// 4. Data Engineer — Acesso total de administração de dados do App
db.createRole(
  {
    role: "role_data_engineer",
    privileges: [
      {
        resource: { db: "db_delta_app", collection: "" },
        actions: ["find", "insert", "update", "delete", "createIndex", "dropIndex", "dropCollection", "collMod", "dbStats", "collStats"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_data_engineer' criada (Admin total de dados)");

print("\n" + "=".repeat(60));
print("✅ Roles do Cluster do App configuradas com sucesso!");
print("=".repeat(60));