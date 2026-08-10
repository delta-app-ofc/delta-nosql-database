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

print("✅ Todos os índices foram criados com sucesso!");