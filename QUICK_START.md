# Delta NoSQL Database — Quick Start

Guia rápido para configurar, testar e usar o MongoDB do Projeto Delta.

---

## 1. Pré-requisitos

- Conta MongoDB Atlas ativa (https://www.mongodb.com/cloud/atlas)
- Duas databases criadas manualmente ou via Atlas UI:
  - `db_delta_telemetry`
  - `db_delta_app`
- `mongosh` instalado localmente ou usar Atlas UI Web Shell

---

## 2. Passo a Passo — Configuração Inicial

### 2.1 Criar as Coleções e Índices

```bash
# Execute em ordem:

# 1️⃣  Criar as coleções com schema validation
mongosh "mongodb+srv://admin:PASSWORD@cluster.mongodb.net/admin" < script-collections.js

# 2️⃣  Criar os índices (crítico para performance)
mongosh "mongodb+srv://admin:PASSWORD@cluster.mongodb.net/admin" < script-indexes.js

# 3️⃣  Configurar Custom Roles (segurança)
mongosh "mongodb+srv://admin:PASSWORD@cluster.mongodb.net/admin" < script-roles.js
```

### 2.2 Inserir Dados de Teste (Opcional)

```bash
# Para validar que tudo está funcionando:
mongosh "mongodb+srv://admin:PASSWORD@cluster.mongodb.net/admin" < script-seed.js

# Depois, conecte ao Atlas UI e verifique:
# - db_delta_telemetry.pulses_raw: 2 docs
# - db_delta_telemetry.consumption_summary: 2 docs
# - etc.
```

### 2.3 Criar Usuários (Manual via Atlas UI)

No Atlas UI → Database → Security → Database Users → Add New Database User:

```
Username: delta_api_service
Password: [GERAR SENHA FORTE]
Custom Role: role_api_service
Database: admin
```

Repita para:
- `delta_databricks_reader` com `role_data_pipeline_reader`
- `delta_dev_admin` com `role_dev_migration`

Salve as connection strings em `.env`:

```bash
# .env (sua API Node.js / Python)
MONGO_TELEMETRY_URI=mongodb+srv://delta_api_service:PASSWORD@cluster.mongodb.net/db_delta_telemetry
MONGO_APP_URI=mongodb+srv://delta_api_service:PASSWORD@cluster.mongodb.net/db_delta_app
```

---

## 3. Verificar Tudo Está OK

```bash
# Conectar e testar
mongosh "mongodb+srv://delta_api_service:PASSWORD@cluster.mongodb.net/db_delta_telemetry"

# Dentro do mongosh:
use db_delta_telemetry;

// Ver coleções
show collections;

// Ver documentos
db.consumption_summary.find().limit(5);

// Ver índices
db.consumption_summary.getIndexes();
```

---

## 4. Usar no Código (Node.js + MongoDB Driver)

### 4.1 Exemplo: Ingerir Telemetria

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_TELEMETRY_URI);

async function ingestPulses(espPacket) {
  try {
    await client.connect();
    const db = client.db("db_delta_telemetry");
    
    // 1. Salvar o bruto (TTL vai cuidar de expirar)
    await db.collection("pulses_raw").insertOne({
      device_id: espPacket.device_id,
      sent_at: new Date(espPacket.sent_at),
      window_minutes: espPacket.window_minutes,
      total_pulses: espPacket.pulses.length,
      pulses: espPacket.pulses // array com pulsed_at, ms_since_boot, delta_ms
    });
    
    // 2. IA processa e gera resumo
    const summary = await processWithAI(espPacket);
    
    // 3. Salvar resumo (permanente)
    await db.collection("consumption_summary").insertOne({
      device_id: espPacket.device_id,
      user_id: summary.user_id,
      window_started_at: new Date(summary.window_start),
      window_finished_at: new Date(summary.window_end),
      consumption_liters: summary.liters,
      lpm_average: summary.avg_lpm,
      anomaly_detected: summary.is_anomaly
    });
    
    // 4. Atualizar status do dispositivo
    await db.collection("device_status").updateOne(
      { device_id: espPacket.device_id },
      {
        $set: {
          last_ping_at: new Date(),
          connectivity_status: "online",
          wifi_signal_rssi: espPacket.rssi,
          firmware_version: espPacket.fw_version
        }
      },
      { upsert: true }
    );
    
  } finally {
    await client.close();
  }
}
```

### 4.2 Exemplo: Ler Histórico no App

```javascript
async function getUserConsumptionHistory(userId, days = 30) {
  const client = new MongoClient(process.env.MONGO_APP_URI);
  
  try {
    await client.connect();
    const db = client.db("db_delta_app");
    const telemetry_db = client.db("db_delta_telemetry");
    
    // Preferências do usuário
    const prefs = await db.collection("user_preferences").findOne({
      user_id: userId
    });
    
    // Histórico de consumo (últimos X dias)
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const consumption = await telemetry_db
      .collection("consumption_summary")
      .find({
        user_id: userId,
        window_started_at: { $gte: startDate }
      })
      .sort({ window_started_at: -1 })
      .toArray();
    
    return {
      preferences: prefs,
      consumption_history: consumption,
      total_days: consumption.length / 288 // 288 janelas de 5min/dia
    };
    
  } finally {
    await client.close();
  }
}
```

### 4.3 Exemplo: Chat Session

```javascript
async function saveChatMessage(userId, message, sender = "user") {
  const client = new MongoClient(process.env.MONGO_APP_URI);
  
  try {
    await client.connect();
    const db = client.db("db_delta_app");
    
    // Encontrar sessão aberta
    let session = await db.collection("chat_sessions").findOne({
      user_id: userId,
      is_open: true
    });
    
    // Se não houver, criar nova
    if (!session) {
      const result = await db.collection("chat_sessions").insertOne({
        user_id: userId,
        started_at: new Date(),
        last_activity_at: new Date(),
        is_open: true,
        is_active: true,
        is_deleted: false,
        messages: []
      });
      session = { _id: result.insertedId };
    }
    
    // Adicionar mensagem
    await db.collection("chat_sessions").updateOne(
      { _id: session._id },
      {
        $push: {
          messages: {
            role: sender,
            text: message,
            sent_at: new Date(),
            api_status_code: 200
          }
        },
        $set: { last_activity_at: new Date() }
      }
    );
    
  } finally {
    await client.close();
  }
}
```

---

## 5. Estrutura de Diretórios (Este Repositório)

```
delta-nosql-database/
├── README.md                    # Visão geral
├── QUICK_START.md              # Este arquivo
├── script-collections.js       # Criar coleções (executar 1º)
├── script-indexes.js           # Criar índices (executar 2º)
├── script-roles.js             # Criar Custom Roles (executar 3º)
├── script-seed.js              # Dados de teste (opcional)
├── collections/
│   ├── db_delta_telemetry.md   # Docs: pulses_raw, consumption_summary, device_status
│   └── db_delta_app.md         # Docs: user_preferences, alerts_history, chat_sessions, chat_feedback
└── indexes/                    # (Planejado) Scripts individuais por coleção
```

---

## 6. Troubleshooting

### Problema: "connection string does not provide a database"

```javascript
// ❌ ERRADO
const db = client.db(); // Sem argumentos

// ✅ CORRETO
const db = client.db("db_delta_telemetry"); // Especificar o database
```

### Problema: "no index found for sort"

MongoDB precisa de índices compostos para ordenar. Verifique se o índice existe:

```bash
mongosh
> use db_delta_telemetry
> db.consumption_summary.getIndexes()
```

Se faltar, execute `script-indexes.js` novamente.

### Problema: "duplicate key error on index"

Seus dados violam um índice ÚNICO. Exemplo:

```javascript
// Se há dois docs com device_id = "ESP32-SP-0912" em device_status
// Solução: deletar o extra
db.device_status.deleteMany({ device_id: "ESP32-SP-0912" });
```

### Problema: "Document is too large" (ao adicionar mensagem no chat)

O array de mensagens atingiu o limite (~16MB). Feche a sessão:

```javascript
db.chat_sessions.updateOne(
  { _id: ObjectId("...") },
  { $set: { is_open: false } } // Força novo chat
);
```

---

## 7. Monitoramento em Produção

No Atlas UI → Monitoring:

- **Database Performance**: Taxa de leitura/escrita, índices usados
- **Query Profiler**: Operações lentas
- **Alerts**: Configurar para crescimento anormal de collections

---

## 8. Backup & Disaster Recovery

Atlas oferece backup automático. Para restore:

Atlas UI → Backups → Restore a Snapshot → New Cluster/Existing

---

## Próximos Passos

- [ ] Conectar a API Node.js usando `script-collections.js` como referência
- [ ] Testar com dados reais do ESP32
- [ ] Configurar Databricks para extrair dados (`role_data_pipeline_reader`)
- [ ] Monitorar Query Performance no Atlas
- [ ] Implementar `chat_context` quando bot evoluir para LLM
