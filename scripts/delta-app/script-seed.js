/**
 * Delta Project — MongoDB Seed Data
 * 
 * Este script insere dados iniciais de teste/exemplo para validar
 * a estrutura do banco em ambiente de desenvolvimento.
 * 
 * ⚠️  NÃO execute em produção!
 * 
 * Execução:
 *   mongosh < script-seed.js
 */

use("db_delta_app");

// ─────────────────────────────────────────────────────────────────────────
// Seed: user_preferences
// ─────────────────────────────────────────────────────────────────────────

db.user_preferences.insertMany([
  {
    user_id: NumberInt(212),
    daily_liters_target: NumberInt(300),
    notifications_enabled: true,
    quiet_hours: { start_hour: "22:00", end_hour: "06:00" },
    dark_mode_enabled: false
  },
  {
    user_id: NumberInt(213),
    daily_liters_target: NumberInt(250),
    notifications_enabled: true,
    quiet_hours: { start_hour: "23:00", end_hour: "07:00" },
    dark_mode_enabled: true
  }
]);

print("✓ 2 documentos inseridos em user_preferences");

// ─────────────────────────────────────────────────────────────────────────
// Seed: alerts_history
// ─────────────────────────────────────────────────────────────────────────

db.alerts_history.insertMany([
  {
    device_id: "ESP32-SP-0912",
    user_id: NumberInt(212),
    alert_type: "vazamento_continuo",
    triggered_at: new Date("2026-07-16T03:12:00Z"),
    resolved_at: new Date("2026-07-16T08:30:00Z"),
    severity: "high"
  },
  {
    device_id: "ESP32-SP-0913",
    user_id: NumberInt(213),
    alert_type: "fluxo_atipico",
    triggered_at: new Date("2026-07-17T14:00:00Z"),
    resolved_at: null,
    severity: "medium"
  }
]);

print("✓ 2 documentos inseridos em alerts_history");

// ─────────────────────────────────────────────────────────────────────────
// Seed: chat_sessions
// ─────────────────────────────────────────────────────────────────────────

db.chat_sessions.insertMany([
  {
    user_id: NumberInt(212),
    started_at: new Date("2026-07-17T14:00:00Z"),
    last_activity_at: new Date("2026-07-17T14:05:00Z"),
    is_open: false,
    is_active: false,
    is_deleted: false,
    messages: [
      {
        role: "user",
        text: "Por que meu consumo subiu tanto ontem?",
        sent_at: new Date("2026-07-17T14:00:05Z"),
        api_status_code: NumberInt(200)
      },
      {
        role: "bot",
        text: "Identifiquei um fluxo contínuo de 2.8 LPM de madrugada. Pode ser um vazamento.",
        sent_at: new Date("2026-07-17T14:00:12Z"),
        api_status_code: NumberInt(200)
      }
    ]
  }
]);

print("✓ 1 documento inserido em chat_sessions");

// ─────────────────────────────────────────────────────────────────────────
// Seed: chat_feedback
// ─────────────────────────────────────────────────────────────────────────

// Nota: Para este exemplo, precisaríamos do _id da sessão criada acima
// A forma mais segura é fazer insert e depois recuperar o ID
const lastSession = db.chat_sessions.findOne({ user_id: NumberInt(212) });

if (lastSession) {
  db.chat_feedback.insertOne({
    session_id: lastSession._id,
    is_satisfied: true,
    user_comment: "Resolveu minha dúvida rápido.",
    created_at: new Date("2026-07-17T14:06:00Z")
  });
  
  print("✓ 1 documento inserido em chat_feedback");
} else {
  print("⚠️  Aviso: chat_session não encontrada para seed de feedback");
}

// ─────────────────────────────────────────────────────────────────────────
// RESUMO
// ─────────────────────────────────────────────────────────────────────────

print("\n" + "=".repeat(70));
print("✅ Dados de seed inseridos com sucesso!");
print("=".repeat(70));
