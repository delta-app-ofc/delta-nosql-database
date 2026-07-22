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
      required: ["user_id", "dark_mode_enabled", "notifications_enabled"],
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
            start_hour: {
              bsonType: "string",
              description: "Horário da abertura da janela de silenciamento de notificações"
            },
            end_hour: {
              bsonType: "string",
              description: "Horário da encerramento da janela de silenciamento de notificações"
            }
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
              role: {
                enum: ["user", "bot"],
                description: "Remetente da mensagem: user -> usuário do app / bot: o modelo de IA"
              },
              text: {
                bsonType: "string",
                description: "Texto da mensagem na íntegra"
              },
              sent_at: {
                bsonType: "date",
                description: "Horário de envio da mensagem"
              },
              api_status_code: {
                bsonType: "int",
                description: "Código do status enviado pela API"
              }
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