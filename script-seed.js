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

use("db_delta_telemetry");

// ─────────────────────────────────────────────────────────────────────────
// Seed: pulses_raw (dados de exemplo)
// ─────────────────────────────────────────────────────────────────────────

db.pulses_raw.insertMany([
  {
    device_id: "ESP32-SP-0912",
    sent_at: new Date("2026-07-17T17:10:00Z"),
    window_minutes: 5,
    total_pulses: 3,
    pulses: [
      { pulsed_at: new Date("2026-07-17T17:05:12Z"), ms_since_boot: 3452210, delta_ms: 0 },
      { pulsed_at: new Date("2026-07-17T17:05:15Z"), ms_since_boot: 3453210, delta_ms: 1000 },
      { pulsed_at: new Date("2026-07-17T17:06:45Z"), ms_since_boot: 3545210, delta_ms: 92000 }
    ]
  },
  {
    device_id: "ESP32-SP-0913",
    sent_at: new Date("2026-07-17T17:10:05Z"),
    window_minutes: 5,
    total_pulses: 1,
    pulses: [
      { pulsed_at: new Date("2026-07-17T17:07:30Z"), ms_since_boot: 4050000, delta_ms: 0 }
    ]
  }
]);

print("✓ 2 documentos inseridos em pulses_raw");

// ─────────────────────────────────────────────────────────────────────────
// Seed: consumption_summary
// ─────────────────────────────────────────────────────────────────────────

db.consumption_summary.insertMany([
  {
    device_id: "ESP32-SP-0912",
    user_id: "60c72b2f9b1d8b2bad723456",
    window_started_at: new Date("2026-07-17T17:05:00Z"),
    window_finished_at: new Date("2026-07-17T17:10:00Z"),
    consumption_liters: 14,
    lpm_average: 2,
    anomaly_detected: false
  },
  {
    device_id: "ESP32-SP-0913",
    user_id: "60c72b2f9b1d8b2bad723457",
    window_started_at: new Date("2026-07-17T17:05:00Z"),
    window_finished_at: new Date("2026-07-17T17:10:00Z"),
    consumption_liters: 8,
    lpm_average: 1,
    anomaly_detected: false
  }
]);

print("✓ 2 documentos inseridos em consumption_summary");

// ─────────────────────────────────────────────────────────────────────────
// Seed: device_status
// ─────────────────────────────────────────────────────────────────────────

db.device_status.insertMany([
  {
    device_id: "ESP32-SP-0912",
    last_ping_at: new Date("2026-07-17T17:10:00Z"),
    wifi_signal_rssi: "good",
    firmware_version: "v1.2.3",
    connectivity_status: "online",
    unavailability_reason: null
  },
  {
    device_id: "ESP32-SP-0913",
    last_ping_at: new Date("2026-07-17T17:09:50Z"),
    wifi_signal_rssi: "weak",
    firmware_version: "v1.2.2",
    connectivity_status: "online",
    unavailability_reason: null
  }
]);

print("✓ 2 documentos inseridos em device_status");

use("db_delta_app");

// ─────────────────────────────────────────────────────────────────────────
// Seed: user_preferences
// ─────────────────────────────────────────────────────────────────────────

db.user_preferences.insertMany([
  {
    user_id: "60c72b2f9b1d8b2bad723456",
    daily_liters_target: 300,
    notifications_enabled: true,
    quiet_hours: { start_hour: "22:00", end_hour: "06:00" },
    dark_mode_enabled: false
  },
  {
    user_id: "60c72b2f9b1d8b2bad723457",
    daily_liters_target: 250,
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
    user_id: "60c72b2f9b1d8b2bad723456",
    alert_type: "vazamento_continuo",
    triggered_at: new Date("2026-07-16T03:12:00Z"),
    resolved_at: new Date("2026-07-16T08:30:00Z"),
    severity: "high"
  },
  {
    device_id: "ESP32-SP-0913",
    user_id: "60c72b2f9b1d8b2bad723457",
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
    user_id: "60c72b2f9b1d8b2bad723456",
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
        api_status_code: 200
      },
      {
        role: "bot",
        text: "Identifiquei um fluxo contínuo de 2.8 LPM de madrugada. Pode ser um vazamento.",
        sent_at: new Date("2026-07-17T14:00:12Z"),
        api_status_code: 200
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
const lastSession = db.chat_sessions.findOne({ user_id: "60c72b2f9b1d8b2bad723456" });

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
print("\n📊 SUMÁRIO:");
print("   db_delta_telemetry:");
print("     • pulses_raw: 2 documentos");
print("     • consumption_summary: 2 documentos");
print("     • device_status: 2 documentos");
print("   db_delta_app:");
print("     • user_preferences: 2 documentos");
print("     • alerts_history: 2 documentos");
print("     • chat_sessions: 1 documento");
print("     • chat_feedback: 1 documento");
print("\n⚠️  IMPORTANTE: Estes dados são apenas para teste/validação.");
print("    Limpe a base antes de usar em produção!");
