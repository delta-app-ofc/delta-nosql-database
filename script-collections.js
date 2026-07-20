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
              pulsed_at: { bsonType: "date" },
              ms_since_boot: { bsonType: "long" },
              delta_ms: { bsonType: "int" }
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
      required: ["device_id", "window_started_at", "window_finished_at", "consumption_liters"],
      properties: {
        _id: { bsonType: "objectId" },
        device_id: { 
          bsonType: "string",
          description: "Identificador do dispositivo"
        },
        user_id: { 
          bsonType: "string",
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
          bsonType: "long",
          description: "Volume total consumido na janela"
        },
        lpm_average: { 
          bsonType: "int",
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

// ============================================================================
// DATABASE: db_delta_app
// ============================================================================

use("db_delta_app");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: user_preferences
// Descrição: Preferências por usuário (metas, horários de silêncio, etc.)
// Ciclo de vida: Permanente
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("user_preferences", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "dark_mode_enabled"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { 
          bsonType: "string",
          description: "Referência ao usuário (ID do PostgreSQL)"
        },
        daily_liters_target: { 
          bsonType: "int",
          description: "Meta diária de consumo em litros"
        },
        notifications_enabled: { 
          bsonType: "bool",
          description: "Ativa/desativa push notifications"
        },
        quiet_hours: {
          bsonType: "object",
          description: "Janela de horário silencioso",
          properties: {
            start_hour: { bsonType: "string" },
            end_hour: { bsonType: "string" }
          }
        },
        dark_mode_enabled: { 
          bsonType: "bool",
          description: "Preferência visual do app"
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'user_preferences' criada (db_delta_app)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: alerts_history
// Descrição: Registro de alertas disparados pela IA
// Ciclo de vida: Permanente
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("alerts_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["device_id", "alert_type", "triggered_at"],
      properties: {
        _id: { bsonType: "objectId" },
        device_id: { 
          bsonType: "string",
          description: "Dispositivo que originou o alerta"
        },
        user_id: { 
          bsonType: "string",
          description: "Usuário notificado"
        },
        alert_type: { 
          bsonType: "string",
          enum: ["vazamento_continuo", "fluxo_atipico", "dispositivo_offline", "leitura_impossivel"],
          description: "Tipo de anomalia detectada"
        },
        triggered_at: { 
          bsonType: "date",
          description: "Momento de abertura do alerta"
        },
        resolved_at: { 
          bsonType: ["date", "null"],
          description: "Momento de resolução (null enquanto ativo)"
        },
        severity: {
          enum: ["low", "medium", "high", null],
          description: "Nível de severidade"
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'alerts_history' criada (db_delta_app)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: chat_sessions
// Descrição: Sessões de chat com array de mensagens embutido (padrão Bucket)
// Ciclo de vida: Permanente
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("chat_sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "started_at"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { 
          bsonType: "string",
          description: "Usuário dono da sessão"
        },
        started_at: { 
          bsonType: "date",
          description: "Início da sessão"
        },
        last_activity_at: { 
          bsonType: "date",
          description: "Última interação"
        },
        is_open: { 
          bsonType: "bool",
          description: "Sessão aceita novas mensagens"
        },
        is_active: { 
          bsonType: "bool",
          description: "Sessão em atendimento agora"
        },
        is_deleted: { 
          bsonType: "bool",
          description: "Soft delete (não remove o documento)"
        },
        messages: {
          bsonType: "array",
          description: "Mensagens da sessão (máx. 50-100)",
          items: {
            bsonType: "object",
            properties: {
              role: { enum: ["user", "bot"] },
              text: { bsonType: "string" },
              sent_at: { bsonType: "date" },
              api_status_code: { bsonType: "int" }
            }
          }
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'chat_sessions' criada (db_delta_app)");

// ─────────────────────────────────────────────────────────────────────────
// Coleção: chat_feedback
// Descrição: Avaliações de sessões (referência lógica a chat_sessions)
// Ciclo de vida: Permanente
// ─────────────────────────────────────────────────────────────────────────

db.createCollection("chat_feedback", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["session_id", "is_satisfied"],
      properties: {
        _id: { bsonType: "objectId" },
        session_id: { 
          bsonType: "objectId",
          description: "Referência a chat_sessions._id"
        },
        is_satisfied: { 
          bsonType: "bool",
          description: "Avaliação binária (true = 👍, false = 👎)"
        },
        user_comment: { 
          bsonType: ["string", "null"],
          description: "Feedback livre do usuário"
        },
        created_at: { 
          bsonType: "date",
          description: "Timestamp do feedback"
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("✓ Coleção 'chat_feedback' criada (db_delta_app)");

print("\n✅ Todas as coleções foram criadas com sucesso!");
print("⚠️  Próximas etapas:");
print("   1. Execute: mongosh < script-indexes.js");
print("   2. Execute: mongosh < script-roles.js");
