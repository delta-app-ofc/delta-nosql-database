# Database: db_delta_app

Banco de dados de **aplicação com carga leve** dedicado à experiência do usuário final: preferências, histórico de alertas, e chat de suporte.

## Características

- **Padrão de carga**: Leitura predominante (usuário consultando app)
- **Retenção**: Permanente em todas as coleções
- **Integrações**: Conecta ao PostgreSQL (relacionamento por IDs)

---

## Coleção: `user_preferences`

### Descrição

Preferências do aplicativo por usuário: meta de consumo, horários de silêncio para alertas, modo escuro, etc.

### Ciclo de Vida

- **Retenção**: Permanente
- **Propósito**: Guardar customizações do usuário; lido a cada processamento de telemetria
- **Frequência de leitura**: Alta (a cada 5 min quando processando novo pacote)

### Estrutura

```json
{
  "_id": ObjectId("60c72b2f9b1d8b2bad723456"),
  "user_id": 212,
  "daily_liters_target": 300,
  "notifications_enabled": true,
  "quiet_hours": {
    "start_hour": "22:00",
    "end_hour": "06:00"
  },
  "dark_mode_enabled": false
}
```

### Índices

| Nome | Tipo | Campos | Justificativa |
|---|---|---|---|
| `idx_user_id_unique` | **ÚNICO** | `user_id` | Uma entrada por usuário |

### Padrões de Query

```javascript
// API: Buscar preferências do usuário
db.user_preferences.findOne({ user_id: 212 });

// Atualizar meta do usuário
db.user_preferences.updateOne(
  { user_id: 212 },
  { $set: { daily_liters_target: 350 } },
  { upsert: true }
);
```

---

## Coleção: `alerts_history`

### Descrição

Registro definitivo de **cada anomalia disparada pela IA** — vazamentos, fluxo anômalo, dispositivo offline. É a fonte de dados que o app renderiza na tela de notificações do usuário.

### Ciclo de Vida

- **Retenção**: Permanente
- **Propósito**: Histórico de alertas do usuário; métricas de incidentes
- **Frequência de escrita**: Esporádica (apenas quando IA detecta anomalia)

### Estrutura

```json
{
  "_id": ObjectId("60c72b2f9b1d8b2bad723456"),
  "device_id": "ESP32-SP-0912",
  "user_id": 212,
  "alert_type": "vazamento_continuo",
  "triggered_at": "2026-07-16T03:12:00Z",
  "resolved_at": "2026-07-16T08:30:00Z",
  "severity": "high"
}
```

### Campos válidos: `alert_type`

- `vazamento_continuo` — Fluxo constante detectado (padrão de vazamento)
- `fluxo_atipico` — Consumo fora da rotina aprendida
- `dispositivo_offline` — Aparelho não respondeu há mais de 30 min
- `leitura_impossivel` — Sensor não consegue fazer leitura confiável

### Índices

| Nome | Tipo | Campos | Justificativa |
|---|---|---|---|
| `idx_user_triggered_at_desc` | Composto | `user_id`, `triggered_at` DESC | **Crítico**: tela de notificações |
| `idx_device_unresolved_alerts` | Parcial | `device_id`, `resolved_at` | Alertas ativos por device |

### Padrões de Query

```javascript
// App: Últimos alertas do usuário (tela de notificações)
db.alerts_history.find({
  user_id: 212
}).sort({ triggered_at: -1 }).limit(20);

// Alertas ainda ativos (não resolvidos)
db.alerts_history.find({
  device_id: "ESP32-SP-0912",
  resolved_at: null
});

// Admin: Incidentes no mês
db.alerts_history.find({
  triggered_at: { 
    $gte: ISODate("2026-07-01T00:00:00Z"),
    $lt: ISODate("2026-08-01T00:00:00Z")
  }
}).sort({ triggered_at: -1 });
```

---

## Coleção: `chat_sessions`

### Descrição

Sessões de chat entre usuário e bot de suporte. Usa o padrão **Bucket** (uma sessão = um documento com array de mensagens embutido).

### Ciclo de Vida

- **Retenção**: Permanente
- **Propósito**: Histórico conversacional; treino futuro de modelo de IA
- **Frequência de escrita**: Moderada (usuário abre chat ocasionalmente)

### Limite de Tamanho

Cada documento pode ter no máximo **50–100 mensagens**. Ao atingir o limite, o back-end:
1. Fecha a sessão (`is_open: false`)
2. Cria uma nova sessão (ex: "Parte 2")

### Estrutura

```json
{
  "_id": ObjectId("60c72b2f9b1d8b2bad723456"),
  "user_id": 212,
  "started_at": "2026-07-17T14:00:00Z",
  "last_activity_at": "2026-07-17T14:05:00Z",
  "is_open": false,
  "is_active": false,
  "is_deleted": false,
  "messages": [
    {
      "role": "user",
      "text": "Por que meu consumo subiu tanto ontem?",
      "sent_at": "2026-07-17T14:00:05Z",
      "api_status_code": 200
    },
    {
      "role": "bot",
      "text": "Identifiquei um fluxo contínuo de 2.8 LPM de madrugada. Pode ser um vazamento.",
      "sent_at": "2026-07-17T14:00:12Z",
      "api_status_code": 200
    }
  ]
}
```

### Índices

| Nome | Tipo | Campos | Justificativa |
|---|---|---|---|
| `idx_user_activity_desc` | Composto | `user_id`, `last_activity_at` DESC | Lista de atendimentos anteriores |
| `idx_user_open_sessions` | Composto | `user_id`, `is_open` | Encontrar sessão aberta |

### Padrões de Query

```javascript
// App: Histórico de chats do usuário
db.chat_sessions.find({
  user_id: 212
}).sort({ last_activity_at: -1 }).limit(20);

// App: Abrir chat anterior para continuar
db.chat_sessions.findOne({
  _id: ObjectId("..."),
  user_id: 212
});

// Back-end: Encontrar uma sessão aberta para o usuário
db.chat_sessions.findOne({
  user_id: 212,
  is_open: true
});

// Back-end: Adicionar nova mensagem
db.chat_sessions.updateOne(
  { _id: ObjectId("...") },
  {
    $push: { messages: { role: "bot", text: "...", sent_at: new Date(), api_status_code: 200 } },
    $set: { last_activity_at: new Date() }
  }
);
```

### Reabertura de Sessão

Se o usuário abrir um chat anterior e enviar uma mensagem nova:

```javascript
// Back-end: Reabrir se estava fechada
db.chat_sessions.updateOne(
  { _id: ObjectId("...") },
  {
    $set: { is_open: true, is_active: true },
    $push: { messages: { ... } }
  }
);

// Opcionalmente, recria chat_context (ver db_delta_app.md seção Chat Context — Planejada)
```

---

## Coleção: `chat_feedback`

### Descrição

Avaliação do usuário sobre cada sessão de chat encerrada (satisfação com o bot, comentário livre).

### Ciclo de Vida

- **Retenção**: Permanente
- **Propósito**: Métricas de satisfação; input para melhoria contínua do bot
- **Frequência de escrita**: Baixa (usuário avalia ao fim de sessão)

### Estrutura

```json
{
  "_id": ObjectId("60c72b2f9b1d8b2bad723c001"),
  "session_id": ObjectId("61a8f9c2b9d1b2bad723c001"),
  "is_satisfied": true,
  "user_comment": "Resolveu minha dúvida rápido.",
  "created_at": "2026-07-17T14:06:00Z"
}
```

### Índices

| Nome | Tipo | Campos | Justificativa |
|---|---|---|---|
| `idx_session_id` | Simples | `session_id` | Cruzar com chat_sessions |

### Padrões de Query

```javascript
// App: Buscar feedback de uma sessão
db.chat_feedback.findOne({
  session_id: ObjectId("61a8f9c2b9d1b2bad723c001")
});

// Analytics: Satisfação do mês
db.chat_feedback.aggregate([
  {
    $match: {
      created_at: {
        $gte: ISODate("2026-07-01T00:00:00Z"),
        $lt: ISODate("2026-08-01T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: null,
      total_sessions: { $sum: 1 },
      satisfied: { $sum: { $cond: ["$is_satisfied", 1, 0] } },
      satisfaction_rate: { 
        $avg: { $cond: ["$is_satisfied", 1, 0] }
      }
    }
  }
]);
```

---

## Estruturas Planejadas (Ainda não Implementadas)

### `chat_context` (Futuro)

Quando o chatbot evoluir de regras fixas para um modelo conversacional (LLM), será necessário guardar o contexto temporário (tópico atual, entidades extraídas) para reduzir o custo de tokens.

**Características esperadas:**
- TTL Index: 30 minutos
- Campos: `session_id`, `current_topic`, `extracted_entities`, etc.
- Uso: Alimentar API de IA com resumo mastigado, não com 100 mensagens

**Status**: Design pronto, implementação aguardando evolução do bot para LLM.

---

## Integrações com PostgreSQL

Os IDs no MongoDB (`user_id`, `device_id`) são **referências lógicas** para registros no PostgreSQL:

- `user_id` → `tb_user.id` no PostgreSQL
- `device_id` → `tb_device.device_id` no PostgreSQL

O MongoDB **não impõe Foreign Keys** (típico de NoSQL), então a validação desses IDs é responsabilidade do código do back-end antes de inserir.
