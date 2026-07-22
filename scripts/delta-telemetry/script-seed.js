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

// ─────────────────────────────────────────────────────────────────────────
// RESUMO
// ─────────────────────────────────────────────────────────────────────────

print("\n" + "=".repeat(70));
print("✅ Dados de seed inseridos com sucesso!");
print("=".repeat(70));