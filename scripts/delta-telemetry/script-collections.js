/**
 * Delta Project — MongoDB Collections Setup
 * 
 * Este script cria as coleções MongoDB para o Projeto Delta.
 * Siga a ordem: crie os dois databases antes de executar este script.
 * 
 * Uso:
 *   mongosh < script-collections.js
 *   ou
 *   mongosh atlas-connection-string --file script-collections.js
 */

// ============================================================================
// DATABASE: db_delta_telemetry
// ============================================================================

use("db_delta_telemetry");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: pulses_raw
// Descrição: Payload bruto do ESP32 com array detalhado de pulsos
// Ciclo de vida: 7 dias com TTL Index
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("pulses_raw", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id", "sent_at", "total_pulses"],
      properties: {
        _id: { bsonType: "objectId" },
        device_id: { 
          bsonType: "string",
          description: "Identificador único do dispositivo (ESP32/Arduino)"
        },
        sent_at: { 
          bsonType: "date",
          description: "Timestamp de envio do pacote"
        },
        window_minutes: { 
          bsonType: "int",
          description: "Duração da janela de coleta em minutos"
        },
        total_pulses: { 
          bsonType: "int",
          description: "Total de pulsos capturados na janela"
        },
        pulses: {
          bsonType: "array",
          description: "Array detalhado de cada pulso com timestamps e deltas",
          items: {
            bsonType: "object",
            properties: {
              pulsed_at: { 
                bsonType: "date" ,
                description: "Horário exato queo pulso foi disparado"
              },
              ms_since_boot: { 
                bsonType: ["int", "long"],
                description: "Tempo em milissegundos desde o início da captura pelo aparelho"
              },
              delta_ms: { 
                bsonType: ["int", "long"],
                description: "Tempo em milissegundos desde o último disparo"
              }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'pulses_raw' criada (db_delta_telemetry)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: consumption_summary
// Descrição: Resumo consolidado de consumo por janela de 5 minutos
// Ciclo de vida: Permanente (sem TTL)
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("consumption_summary", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id", "user_id", "window_started_at", "window_finished_at", "consumption_liters"],
      properties: {
        _id: { bsonType: "objectId" },
        device_id: { 
          bsonType: "string",
          description: "Identificador do dispositivo"
        },
        user_id: { 
          bsonType: "int",
          description: "ID do usuário dono do dispositivo (referência para PostgreSQL)"
        },
        window_started_at: { 
          bsonType: "date",
          description: "Início da janela de consumo"
        },
        window_finished_at: { 
          bsonType: "date",
          description: "Fim da janela de consumo"
        },
        consumption_liters: { 
          bsonType: "double",
          description: "Volume total consumido na janela"
        },
        lpm_average: { 
          bsonType: "double",
          description: "Vazão média em litros por minuto"
        },
        anomaly_detected: { 
          bsonType: "bool",
          description: "Flag setada pela IA para anomalias"
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'consumption_summary' criada (db_delta_telemetry)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: device_status
// Descrição: Status único por dispositivo, atualizado via upsert
// Ciclo de vida: Permanente
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("device_status", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id"],
      properties: {
        _id: { bsonType: "objectId" },
        device_id: { 
          bsonType: "string",
          description: "Identificador único do dispositivo"
        },
        last_ping_at: { 
          bsonType: "date",
          description: "Timestamp do último contato"
        },
        wifi_signal_rssi: {
          enum: ["excellent", "good", "weak", "critical", null],
          description: "Classificação do sinal Wi-Fi"
        },
        firmware_version: { 
          bsonType: "string",
          description: "Versão do firmware instalado"
        },
        connectivity_status: {
          enum: ["online", "offline", "unstable", null],
          description: "Status de conectividade"
        },
        unavailability_reason: { 
          bsonType: ["string", "null"],
          description: "Motivo do status offline/unstable"
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'device_status' criada (db_delta_telemetry)");

print("\n✅ Todas as coleções foram criadas com sucesso!");
