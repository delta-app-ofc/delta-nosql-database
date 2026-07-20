/**
 * Delta Project — MongoDB Custom Roles & Governance Setup
 * 
 * Este script cria as Custom Roles (funções personalizadas) do MongoDB
 * para o Projeto Delta, seguindo o padrão de governança documentado
 * em DADOS/governanca-acesso.md.
 * 
 * ⚠️  IMPORTANTE: Este script deve ser executado com privilégios de admin
 *     na conta MongoDB Atlas. Geralmente exige conexão de admin.
 * 
 * Execução: Execute este script APÓS script-indexes.js
 * 
 * Uso:
 *   mongosh --authenticationDatabase admin < script-roles.js
 *   ou no Atlas UI: Database > Security > Custom Roles > Add Custom Role
 */

// ============================================================================
// CONTEXT: Executar como admin
// ============================================================================

use("admin");

// ============================================================================
// Custom Role 1: role_api_service
// Database: db_delta_telemetry
// Descrição: Credencial para a API Back-end ingerir dados de telemetria
// ============================================================================

db.createRole(
  {
    role: "role_api_service",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "pulses_raw" },
        actions: ["find", "insert", "update"]
      },
      {
        resource: { db: "db_delta_telemetry", collection: "consumption_summary" },
        actions: ["find", "insert", "update"]
      },
      {
        resource: { db: "db_delta_telemetry", collection: "device_status" },
        actions: ["find", "insert", "update"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);

print("✓ Custom Role 'role_api_service' criada");
print("  Permissões: CRUD limitado em coleções de telemetria");
print("  Uso: API do Back-end para ingestão ESP32");

// ============================================================================
// Custom Role 2: role_data_pipeline_reader
// Database: db_delta_telemetry
// Descrição: Credencial para Databricks/Spark extrair dados
// ============================================================================

db.createRole(
  {
    role: "role_data_pipeline_reader",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find", "listCollections", "listIndexes"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);

print("✓ Custom Role 'role_data_pipeline_reader' criada");
print("  Permissões: Leitura pura (find) em todo db_delta_telemetry");
print("  Uso: Databricks/Spark para pipeline analítico");

// ============================================================================
// Custom Role 3: role_dev_migration
// Database: db_delta_telemetry + db_delta_app
// Descrição: Credencial para time técnico manter estrutura do banco
// ============================================================================

db.createRole(
  {
    role: "role_dev_migration",
    privileges: [
      {
        resource: { db: "db_delta_telemetry", collection: "" },
        actions: ["find", "insert", "update", "delete", "createIndex", "createCollection", "collMod"]
      },
      {
        resource: { db: "db_delta_app", collection: "" },
        actions: ["find", "insert", "update", "delete", "createIndex", "createCollection", "collMod"]
      }
    ],
    roles: []
  },
  { w: "majority", j: true }
);

print("✓ Custom Role 'role_dev_migration' criada");
print("  Permissões: CRUD + DDL em ambos databases");
print("  Uso: Time técnico (Mariana, Samuel) para manutenção");

// ============================================================================
// NOTA SOBRE ROLES DO USUÁRIO (user_preferences)
// ============================================================================

// As Custom Roles acima são "Server Roles" que definem o escopo de permissão.
// Na prática, você cria DATABASE USERS (credenciais) e associa essas roles:
//
// Exemplo (execute no Atlas UI ou via mongosh):
// ───────────────────────────────────────────────
// db.createUser({
//   user: "delta_api_service",
//   pwd: "STRONG_PASSWORD_HERE",
//   roles: [
//     { role: "role_api_service", db: "admin" }
//   ]
// });
//
// Isso cria um usuário "delta_api_service" que tem EXATAMENTE os
// privilégios definidos em role_api_service.

// ============================================================================
// ATRIBUIÇÃO DE ROLES AOS USUÁRIOS (para referência)
// ============================================================================

// Conforme documentado em DADOS/governanca-acesso.md:
//
// | Serviço/Pessoa | Papel | Custom Role |
// |---|---|---|
// | Serviço API (Back-end) | Ingestão de dados IoT | role_api_service |
// | Databricks/Spark | Extração para Delta Lake | role_data_pipeline_reader |
// | Mariana / Samuel | Manutenção técnica | role_dev_migration |
// | Ana / Davi / João / Rahquel | Desenvolvimento | Acesso via container local ou staging |
// | Primeiro Ano / Analistas BI | Análise de dados | ❌ ACESSO NEGADO Consomem via PostgreSQL apenas |

print("\n" + "=".repeat(70));
print("✅ Governança de acesso configurada com sucesso!");
print("=".repeat(70));
print("\n📋 PRÓXIMO PASSO (Manual - Execute via Atlas UI ou mongosh):");
print("───────────────────────────────────────────────────────────────");
print("");
print("1. Crie os Database Users associando as Custom Roles:");
print("");
print("   // API Back-end");
print("   db.createUser({");
print("     user: 'delta_api_service',");
print("     pwd: 'SENHA_FORTE_AQUI',");
print("     roles: [{ role: 'role_api_service', db: 'admin' }]");
print("   });");
print("");
print("   // Databricks/Spark");
print("   db.createUser({");
print("     user: 'delta_databricks_reader',");
print("     pwd: 'SENHA_FORTE_AQUI',");
print("     roles: [{ role: 'role_data_pipeline_reader', db: 'admin' }]");
print("   });");
print("");
print("   // Time técnico (Dev)");
print("   db.createUser({");
print("     user: 'delta_dev_admin',");
print("     pwd: 'SENHA_FORTE_AQUI',");
print("     roles: [{ role: 'role_dev_migration', db: 'admin' }]");
print("   });");
print("");
print("2. Guarde as connection strings em variáveis de ambiente (.env):");
print("   MONGO_API_URI=mongodb+srv://delta_api_service:PASSWORD@cluster.mongodb.net/db_delta_telemetry");
print("   MONGO_DATA_URI=mongodb+srv://delta_databricks_reader:PASSWORD@cluster.mongodb.net/db_delta_telemetry");
print("");
print("✅ Todas as Custom Roles estão prontas para usar!");
