import { URL, fileURLToPath } from "node:url";

import {
  Int32,
  MongoServerError,
  ObjectId
} from "mongodb";

import { closeMongo, connectMongo } from "../helpers/mongo-client.js";
import { runMongosh } from "../helpers/run-mongosh.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DATABASE_NAME = "db_delta_app";
const COLLECTIONS_SCRIPT = fileURLToPath(
  new URL("../../scripts/delta-app/script-collections.js", import.meta.url)
);
const INDEXES_SCRIPT = fileURLToPath(
  new URL("../../scripts/delta-app/script-indexes.js", import.meta.url)
);

let client;
let database;
let sequence = 1_000;

function nextInteger() {
  sequence += 1;
  return new Int32(sequence);
}

function nextDeviceId() {
  sequence += 1;
  return `ESP32-APP-${sequence}`;
}

function withoutField(document, fieldName) {
  const copy = { ...document };
  delete copy[fieldName];
  return copy;
}

function validUserPreferences() {
  return {
    user_id: nextInteger(),
    daily_liters_target: new Int32(300),
    notifications_enabled: true,
    quiet_hours: {
      start_hour: "22:00",
      end_hour: "06:00"
    },
    dark_mode_enabled: false
  };
}

function validAlert() {
  return {
    device_id: nextDeviceId(),
    user_id: nextInteger(),
    alert_type: "vazamento_continuo",
    triggered_at: new Date(),
    resolved_at: null,
    severity: "high"
  };
}

function validMessage() {
  return {
    role: "user",
    content_type: "text",
    content: "Como está o meu consumo hoje?",
    sent_at: new Date(),
    api_status_code: new Int32(200)
  };
}

function validChatSession() {
  const startedAt = new Date();

  return {
    user_id: nextInteger(),
    started_at: startedAt,
    last_activity_at: startedAt,
    is_open: true,
    is_active: true,
    is_deleted: false,
    messages: [validMessage()]
  };
}

function validChatFeedback() {
  return {
    session_id: new ObjectId(),
    is_satisfied: true,
    user_comment: "A resposta resolveu a dúvida.",
    created_at: new Date()
  };
}

async function expectValidationError(operation) {
  try {
    await operation();
  } catch (error) {
    expect(error).toBeInstanceOf(MongoServerError);
    expect(error.code).toBe(121);
    return;
  }

  throw new Error("A operação deveria falhar com MongoServerError de código 121.");
}

async function expectDocumentRejected(collectionName, document) {
  await expectValidationError(() =>
    database.collection(collectionName).insertOne(document)
  );
}

async function expectDocumentAccepted(collectionName, document) {
  const result = await database.collection(collectionName).insertOne(document);
  expect(result.acknowledged).toBe(true);
  expect(result.insertedId).toBeInstanceOf(ObjectId);
}

async function expectIndex(collectionName, expectedIndex) {
  const indexes = await database.collection(collectionName).indexes();
  const actualIndex = indexes.find(
    (candidate) => candidate.name === expectedIndex.name
  );

  expect(actualIndex).toBeDefined();
  expect(actualIndex.key).toEqual(expectedIndex.key);

  if (Object.hasOwn(expectedIndex, "unique")) {
    expect(actualIndex.unique).toBe(expectedIndex.unique);
  }

  if (Object.hasOwn(expectedIndex, "partialFilterExpression")) {
    expect(actualIndex.partialFilterExpression).toEqual(
      expectedIndex.partialFilterExpression
    );
  }
}

beforeAll(async () => {
  client = await connectMongo(MONGODB_URI);
  database = client.db(DATABASE_NAME);

  await database.dropDatabase();
  await runMongosh(COLLECTIONS_SCRIPT, MONGODB_URI);
  await runMongosh(INDEXES_SCRIPT, MONGODB_URI);
}, 30_000);

afterAll(async () => {
  try {
    if (database) {
      await database.dropDatabase();
    }
  } finally {
    await closeMongo(client);
  }
}, 30_000);

describe("db_delta_app schema validation", () => {
  describe("user_preferences", () => {
    it("accepts a valid document", async () => {
      await expectDocumentAccepted("user_preferences", validUserPreferences());
    });

    it.each(["user_id", "dark_mode_enabled"])(
      "rejects a document without required field %s",
      async (fieldName) => {
        await expectDocumentRejected(
          "user_preferences",
          withoutField(validUserPreferences(), fieldName)
        );
      }
    );
  });

  describe("alerts_history", () => {
    it("accepts a valid document", async () => {
      await expectDocumentAccepted("alerts_history", validAlert());
    });

    it.each(["device_id", "user_id", "alert_type", "triggered_at"])(
      "rejects a document without required field %s",
      async (fieldName) => {
        await expectDocumentRejected(
          "alerts_history",
          withoutField(validAlert(), fieldName)
        );
      }
    );

    it("rejects an alert_type outside its enum", async () => {
      await expectDocumentRejected("alerts_history", {
        ...validAlert(),
        alert_type: "tipo_desconhecido"
      });
    });

    it("rejects a severity outside its enum", async () => {
      await expectDocumentRejected("alerts_history", {
        ...validAlert(),
        severity: "urgent"
      });
    });
  });

  describe("chat_sessions", () => {
    it("accepts a valid document", async () => {
      await expectDocumentAccepted("chat_sessions", validChatSession());
    });

    it.each(["user_id", "started_at"])(
      "rejects a document without required field %s",
      async (fieldName) => {
        await expectDocumentRejected(
          "chat_sessions",
          withoutField(validChatSession(), fieldName)
        );
      }
    );

    it.each(["role", "content_type", "content", "api_status_code"])(
      "rejects a message without required field %s",
      async (fieldName) => {
        const session = validChatSession();
        session.messages = [withoutField(session.messages[0], fieldName)];
        await expectDocumentRejected("chat_sessions", session);
      }
    );

    it("rejects a message role outside its enum", async () => {
      const session = validChatSession();
      session.messages[0].role = "system";
      await expectDocumentRejected("chat_sessions", session);
    });

    it("rejects a message content_type outside its enum", async () => {
      const session = validChatSession();
      session.messages[0].content_type = "image";
      await expectDocumentRejected("chat_sessions", session);
    });
  });

  describe("chat_feedback", () => {
    it("accepts a valid document", async () => {
      await expectDocumentAccepted("chat_feedback", validChatFeedback());
    });

    it.each(["session_id", "is_satisfied"])(
      "rejects a document without required field %s",
      async (fieldName) => {
        await expectDocumentRejected(
          "chat_feedback",
          withoutField(validChatFeedback(), fieldName)
        );
      }
    );
  });
});

describe("db_delta_app documented indexes", () => {
  it("creates the unique user_preferences index", async () => {
    await expectIndex("user_preferences", {
      name: "idx_user_id_unique",
      key: { user_id: 1 },
      unique: true
    });
  });

  it("creates both alerts_history indexes", async () => {
    await expectIndex("alerts_history", {
      name: "idx_user_triggered_at_desc",
      key: { user_id: 1, triggered_at: -1 }
    });
    await expectIndex("alerts_history", {
      name: "idx_device_unresolved_alerts",
      key: { device_id: 1, resolved_at: 1 },
      partialFilterExpression: { resolved_at: null }
    });
  });

  it("creates both chat_sessions indexes", async () => {
    await expectIndex("chat_sessions", {
      name: "idx_user_activity_desc",
      key: { user_id: 1, last_activity_at: -1 }
    });
    await expectIndex("chat_sessions", {
      name: "idx_user_open_sessions",
      key: { user_id: 1, is_open: 1 }
    });
  });

  it("creates the chat_feedback session index", async () => {
    await expectIndex("chat_feedback", {
      name: "idx_session_id",
      key: { session_id: 1 }
    });
  });
});
