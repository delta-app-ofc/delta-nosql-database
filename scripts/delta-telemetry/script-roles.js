/**
 * Delta Project — MongoDB Governance Setup (Cluster 1: Telemetry)
 * * Este script cria as Custom Roles para o cluster de TELEMETRIA (db_delta_telemetry).
 * Executar com usuário admin no banco 'admin'.
 */

use("admin");

// 1. Service Account da API (Gravação do ESP32 e cálculo do resumo)
db.createRole(
  {
    role: "teste",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find", "insert", "update"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_api_service' criada (Telemetria)");

// 2. BI Analyst — Apenas consulta a 'consumption_summary'
db.createRole(
  {
    role: "role_bi_analyst",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "consumption_summary" },
        actions: ["find", "createIndex"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_bi_analyst' criada (Apenas consumption_summary)");

// 3. Dev Back-end — Leitura para diagnóstico
db.createRole(
  {
    role: "role_dev_backend",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_dev_backend' criada (Read-Only)");

// 4. DevOps Engineer — Infraestrutura, Índices e Monitoramento
db.createRole(
  {
    role: "role_devops_engineer",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find", "createIndex", "dropIndex", "collMod", "dbStats", "collStats"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_devops_engineer' criada (Infra & Índices)");

// 5. Data Engineer — Acesso total de administração de dados
db.createRole(
  {
    role: "role_data_engineer",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find", "insert", "update", "delete", "createIndex", "dropIndex", "dropCollection", "collMod", "dbStats", "collStats"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);
print("✓ Role 'role_data_engineer' criada (Admin total de dados)");

print("\n" + "=".repeat(60));
print("✅ Roles do Cluster de Telemetria configuradas com sucesso!");
print("=".repeat(60));