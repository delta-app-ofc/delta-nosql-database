/**
 * Delta Project — MongoDB Indexes Setup
 * 
 * Este script cria todos os índices necessários para performance
 * das operações de leitura/escrita em produção.
 * 
 * Execução: Execute este script APÓS script-collections.js
 * 
 * Uso:
 *   mongosh < script-indexes.js
 */

// ============================================================================
// DATABASE: db_delta_telemetry
// ============================================================================

use("db_delta_telemetry");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: pulses_raw
// ─────────────────────────────────────────────────────────────────────────

// TTL Index: Expira documentos após 7 dias (604800 segundos)
// Justificativa: pulses_raw é volátil por design; dados brutos são
// processados pela IA e depois descartados. Armazenamento longo prazo
// é responsabilidade do AWS S3/Delta Lake.
db.pulses_raw.createIndex(
  { sent_at: 1 },
  { expireAfterSeconds: 604800, name: "ttl_7days" }
);

print("✓ Índice TTL criado em pulses_raw (7 dias)");

// Índice composto: device_id + sent_at (descendente)
// Justificativa: Suporta queries de debug/reprocessamento por dispositivo
// dentro da janela de 7 dias em que o dado ainda existe.
// Padrão: db.pulses_raw.find({ device_id: "ESP32-SP-0912" }).sort({ sent_at: -1 })
db.pulses_raw.createIndex(
  { device_id: 1, sent_at: -1 },
  { name: "idx_device_sent_at_desc" }
);

print("✓ Índice composto criado em pulses_raw (device_id + sent_at)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: consumption_summary
// ─────────────────────────────────────────────────────────────────────────

// Índice composto CRÍTICO: user_id + window_started_at (descendente)
// Justificativa: Sustenta a leitura do histórico/gráfico de consumo do app.
// É a query mais frequente e deve ser instantânea.
// Padrão: db.consumption_summary.find({ user_id: "...", window_started_at: { $gte: ... } }).sort({ window_started_at: -1 })
db.consumption_summary.createIndex(
  { user_id: 1, window_started_at: -1 },
  { name: "idx_user_window_time" }
);

print("✓ Índice composto criado em consumption_summary (user_id + window_started_at DESC)");

// Índice simples: device_id
// Justificativa: Consultas administrativas/suporte por dispositivo,
// independente do usuário.
db.consumption_summary.createIndex(
  { device_id: 1 },
  { name: "idx_device" }
);

print("✓ Índice simples criado em consumption_summary (device_id)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: device_status
// ─────────────────────────────────────────────────────────────────────────

// Índice único: device_id
// Justificativa: A coleção segue padrão upsert (um documento por dispositivo).
// O índice único é o que garante essa unicidade e viabiliza
// updateOne({ device_id }, ..., { upsert: true }) sem duplicatas.
db.device_status.createIndex(
  { device_id: 1 },
  { unique: true, name: "idx_device_id_unique" }
);

print("✓ Índice ÚNICO criado em device_status (device_id)");

print("✅ Todos os índices foram criados com sucesso!");