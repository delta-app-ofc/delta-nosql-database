import { URL, fileURLToPath } from "node:url";

import {
  Double,
  Int32,
  Long,
  MongoServerError,
  ObjectId
} from "mongodb";

import { closeMongo, connectMongo } from "../helpers/mongo-client.js";
import { runMongosh } from "../helpers/run-mongosh.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const DATABASE_NAME = "db_delta_telemetry";
const COLLECTIONS_SCRIPT = fileURLToPath(
  new URL("../../scripts/delta-telemetry/script-collections.js", import.meta.url)
);
const INDEXES_SCRIPT = fileURLToPath(
  new URL("../../scripts/delta-telemetry/script-indexes.js", import.meta.url)
);

let client;
let database;
let sequence = 2_000;

function nextInteger() {
  sequence += 1;
  return new Int32(sequence);
}

function nextDeviceId() {
  sequence += 1;
  return `ESP32-TELEMETRY-${sequence}`;
}

function withoutField(document, fieldName) {
  const copy = { ...document };
  delete copy[fieldName];
  return copy;
}

function validPulseBatch() {
  const sentAt = new Date();

  return {
    device_id: nextDeviceId(),
    sent_at: sentAt,
    window_minutes: new Int32(5),
    total_pulses: new Int32(2),
    pulses: [
      {
        pulsed_at: new Date(sentAt.getTime() - 2_000),
        ms_since_boot: Long.fromNumber(3_452_210),
        delta_ms: new Int32(0)
      },
      {
        pulsed_at: new Date(sentAt.getTime() - 1_000),
        ms_since_boot: Long.fromNumber(3_453_210),
        delta_ms: Long.fromNumber(1_000)
      }
    ]
  };
}

function validConsumptionSummary() {
  const windowFinishedAt = new Date();

  return {
    device_id: nextDeviceId(),
    user_id: nextInteger(),
    window_started_at: new Date(windowFinishedAt.getTime() - 5 * 60_000),
    window_finished_at: windowFinishedAt,
    consumption_liters: new Double(14.5),
    lpm_average: new Double(2.9),
    anomaly_detected: false
  };
}

function validDeviceStatus() {
  return {
    device_id: nextDeviceId(),
    last_ping_at: new Date(),
    wifi_signal_rssi: "good",
    firmware_version: "v1.2.3",
    connectivity_status: "online",
    unavailability_reason: null
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

  if (Object.hasOwn(expectedIndex, "expireAfterSeconds")) {
    expect(actualIndex.expireAfterSeconds).toBe(
      expectedIndex.expireAfterSeconds
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

describe("db_delta_telemetry schema validation", () => {
  describe("pulses_raw", () => {
    it("accepts a valid document with BSON int and long values", async () => {
      await expectDocumentAccepted("pulses_raw", validPulseBatch());
    });

    it.each(["device_id", "sent_at", "total_pulses"])(
      "rejects a document without required field %s",
      async (fieldName) => {
        await expectDocumentRejected(
          "pulses_raw",
          withoutField(validPulseBatch(), fieldName)
        );
      }
    );

    it("rejects device_id when it is a BSON int", async () => {
      await expectDocumentRejected("pulses_raw", {
        ...validPulseBatch(),
        device_id: new Int32(91)
      });
    });

    it("rejects pulses.ms_since_boot when it is a string", async () => {
      const pulseBatch = validPulseBatch();
      pulseBatch.pulses[0].ms_since_boot = "3452210";
      await expectDocumentRejected("pulses_raw", pulseBatch);
    });
  });

  describe("consumption_summary", () => {
    it("accepts a valid document with BSON double values", async () => {
      await expectDocumentAccepted(
        "consumption_summary",
        validConsumptionSummary()
      );
    });

    it.each([
      "device_id",
      "user_id",
      "window_started_at",
      "window_finished_at",
      "consumption_liters"
    ])("rejects a document without required field %s", async (fieldName) => {
      await expectDocumentRejected(
        "consumption_summary",
        withoutField(validConsumptionSummary(), fieldName)
      );
    });

    it("rejects consumption_liters when it is a BSON int", async () => {
      await expectDocumentRejected("consumption_summary", {
        ...validConsumptionSummary(),
        consumption_liters: new Int32(14)
      });
    });
  });

  describe("device_status", () => {
    it("accepts a valid document", async () => {
      await expectDocumentAccepted("device_status", validDeviceStatus());
    });

    it("rejects a document without required field device_id", async () => {
      await expectDocumentRejected(
        "device_status",
        withoutField(validDeviceStatus(), "device_id")
      );
    });

    it("rejects wifi_signal_rssi outside its enum", async () => {
      await expectDocumentRejected("device_status", {
        ...validDeviceStatus(),
        wifi_signal_rssi: "unavailable"
      });
    });

    it("rejects connectivity_status outside its enum", async () => {
      await expectDocumentRejected("device_status", {
        ...validDeviceStatus(),
        connectivity_status: "unknown"
      });
    });
  });
});

describe("db_delta_telemetry documented indexes", () => {
  it("creates both pulses_raw indexes", async () => {
    await expectIndex("pulses_raw", {
      name: "ttl_7days",
      key: { sent_at: 1 },
      expireAfterSeconds: 604_800
    });
    await expectIndex("pulses_raw", {
      name: "idx_device_sent_at_desc",
      key: { device_id: 1, sent_at: -1 }
    });
  });

  it("creates both consumption_summary indexes", async () => {
    await expectIndex("consumption_summary", {
      name: "idx_user_window_time",
      key: { user_id: 1, window_started_at: -1 }
    });
    await expectIndex("consumption_summary", {
      name: "idx_device",
      key: { device_id: 1 }
    });
  });

  it("creates the unique device_status index", async () => {
    await expectIndex("device_status", {
      name: "idx_device_id_unique",
      key: { device_id: 1 },
      unique: true
    });
  });
});
