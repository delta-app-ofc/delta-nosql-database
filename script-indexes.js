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

// ============================================================================
// DATABASE: db_delta_app
// ============================================================================

use("db_delta_app");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: user_preferences
// ─────────────────────────────────────────────────────────────────────────

// Índice único: user_id
// Justificativa: Um documento de preferências por usuário.
// O sistema lê este documento a cada pacote de telemetria processado
// para checar quiet_hours. Unicidade previne duplicatas.
db.user_preferences.createIndex(
  { user_id: 1 },
  { unique: true, name: "idx_user_id_unique" }
);

print("✓ Índice ÚNICO criado em user_preferences (user_id)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: alerts_history
// ─────────────────────────────────────────────────────────────────────────

// Índice composto: user_id + triggered_at (descendente)
// Justificativa: Alimenta a tela de notificações do app, sempre lida
// por usuário e ordenada por data recente. Uma das queries mais frequentes.
db.alerts_history.createIndex(
  { user_id: 1, triggered_at: -1 },
  { name: "idx_user_triggered_at_desc" }
);

print("✓ Índice composto criado em alerts_history (user_id + triggered_at DESC)");

// Índice composto parcial: device_id + resolved_at (alertas ativos)
// Justificativa: Localiza rapidamente alertas ainda não resolvidos por dispositivo
// sem varrer o histórico já resolvido. Usa partial filter (resolved_at = null).
// Nota: MongoDB suporta partial indexes via filterExpression
db.alerts_history.createIndex(
  { device_id: 1, resolved_at: 1 },
  { 
    partialFilterExpression: { resolved_at: null },
    name: "idx_device_unresolved_alerts"
  }
);

print("✓ Índice composto PARCIAL criado em alerts_history (device_id + resolved_at para alertas ativos)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: chat_sessions
// ─────────────────────────────────────────────────────────────────────────

// Índice composto: user_id + last_activity_at (descendente)
// Justificativa: Lista de "atendimentos anteriores" do usuário,
// ordenada por atividade recente. Interface do app.
db.chat_sessions.createIndex(
  { user_id: 1, last_activity_at: -1 },
  { name: "idx_user_activity_desc" }
);

print("✓ Índice composto criado em chat_sessions (user_id + last_activity_at DESC)");

// Índice composto: user_id + is_open (sesões abertas)
// Justificativa: Localiza rapidamente uma sessão em aberto para decidir
// entre reabrir ou criar uma nova. Reduz varreduras.
db.chat_sessions.createIndex(
  { user_id: 1, is_open: 1 },
  { name: "idx_user_open_sessions" }
);

print("✓ Índice composto criado em chat_sessions (user_id + is_open)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: chat_feedback
// ─────────────────────────────────────────────────────────────────────────

// Índice simples: session_id
// Justificativa: Suporta o cruzamento (via $lookup em agregação) entre
// sessão e sua avaliação, usado em métricas de satisfação do bot.
db.chat_feedback.createIndex(
  { session_id: 1 },
  { name: "idx_session_id" }
);

print("✓ Índice simples criado em chat_feedback (session_id)");

// ============================================================================
// RESUMO EXECUTIVO
// ============================================================================

print("\n" + "=".repeat(70));
print("✅ Todos os índices foram criados com sucesso!");
print("=".repeat(70));
print("\n📊 RESUMO DE ÍNDICES CRIADOS:");
print("   db_delta_telemetry:");
print("     • pulses_raw: TTL (7 dias) + Composto (device_id, sent_at)");
print("     • consumption_summary: Composto (user_id, window_started_at) + Simples (device_id)");
print("     • device_status: ÚNICO (device_id)");
print("   db_delta_app:");
print("     • user_preferences: ÚNICO (user_id)");
print("     • alerts_history: Composto (user_id, triggered_at) + Parcial (device_id, resolved_at)");
print("     • chat_sessions: Composto (user_id, last_activity_at) + Composto (user_id, is_open)");
print("     • chat_feedback: Simples (session_id)");
print("\n⚠️  Próxima etapa: mongosh < script-roles.js");
