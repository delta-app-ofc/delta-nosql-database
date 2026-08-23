import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { BSON, Int32, MongoServerError, ObjectId } from "mongodb";

import { closeMongo, connectMongo } from "../helpers/mongo-client.js";
import { runMongosh } from "../helpers/run-mongosh.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const SOURCE_DATABASE_NAME = "db_delta_telemetry";
const COLLECTIONS_SCRIPT = fileURLToPath(
  new URL(
    "../../scripts/delta-telemetry/script-collections.js",
    import.meta.url
  )
);
const LEGACY_FIXTURES_DIRECTORY = fileURLToPath(
  new URL("../fixtures/delta-telemetry/legacy/", import.meta.url)
);
const EXPECTED_BREAKS_DIRECTORY = join(
  LEGACY_FIXTURES_DIRECTORY,
  "quebra-esperada"
);

const COLLECTION_CASES = [
  {
    name: "pulses_raw",
    update: (document) => ({
      $set: { total_pulses: new Int32(document.total_pulses.value + 1) }
    })
  },
  {
    name: "consumption_summary",
    update: (document) => ({
      $set: { anomaly_detected: !document.anomaly_detected }
    })
  },
  {
    name: "device_status",
    update: (document) => ({
      $set: { firmware_version: `${document.firmware_version ?? ""}-compat` }
    })
  }
];

let client;
let candidateValidators;

function cloneDocument(document) {
  return BSON.deserialize(BSON.serialize(document), {
    promoteLongs: false,
    promoteValues: false
  });
}

async function readEjson(path) {
  const contents = await readFile(path, "utf8");
  return BSON.EJSON.parse(contents, { relaxed: false });
}

async function readExpectedBreak(collectionName) {
  const path = join(EXPECTED_BREAKS_DIRECTORY, `${collectionName}.json`);
  let marker;

  try {
    marker = await readEjson(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  if (typeof marker.reason !== "string" || marker.reason.trim().length === 0) {
    throw new Error(
      `O marcador de quebra esperada de ${collectionName} exige reason não vazio.`
    );
  }

  if (
    marker.document === null ||
    typeof marker.document !== "object" ||
    Array.isArray(marker.document)
  ) {
    throw new Error(
      `O marcador de quebra esperada de ${collectionName} exige um document EJSON.`
    );
  }

  return marker;
}

async function extractCandidateValidators() {
  const sourceDatabase = client.db(SOURCE_DATABASE_NAME);
  const validators = new Map();

  await sourceDatabase.dropDatabase();
  await runMongosh(COLLECTIONS_SCRIPT, MONGODB_URI);

  try {
    for (const { name } of COLLECTION_CASES) {
      const collectionInfo = await sourceDatabase
        .listCollections({ name })
        .next();

      if (!collectionInfo?.options?.validator) {
        throw new Error(`Validator candidato não encontrado para ${name}.`);
      }

      if (collectionInfo.options.validationLevel !== "moderate") {
        throw new Error(
          `validationLevel candidato inesperado para ${name}: ${collectionInfo.options.validationLevel}`
        );
      }

      validators.set(name, collectionInfo.options.validator);
    }
  } finally {
    await sourceDatabase.dropDatabase();
  }

  return validators;
}

async function runCandidateOperation(operation) {
  try {
    return { status: "accepted", result: await operation() };
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 121) {
      throw error;
    }

    return { status: "validation-rejected" };
  }
}

beforeAll(async () => {
  client = await connectMongo(MONGODB_URI);
  candidateValidators = await extractCandidateValidators();
}, 30_000);

afterAll(async () => {
  await closeMongo(client);
}, 30_000);

describe("db_delta_telemetry backward compatibility", () => {
  it.each(COLLECTION_CASES)(
    "keeps the legacy $name document compatible with the candidate validator",
    async ({ name, update }) => {
      const legacyDocument = await readEjson(
        join(LEGACY_FIXTURES_DIRECTORY, `${name}.json`)
      );
      const expectedBreak = await readExpectedBreak(name);
      const scenarioDocument = expectedBreak?.document ?? legacyDocument;
      const scenarioDatabase = client.db(`delta_compat_telemetry_${name}`);
      const intentionalBreak = expectedBreak !== null;

      await scenarioDatabase.dropDatabase();

      try {
        await scenarioDatabase.createCollection(name);
        const collection = scenarioDatabase.collection(name);
        const persistedDocument = cloneDocument(scenarioDocument);
        const initialInsert = await collection.insertOne(persistedDocument);

        expect(initialInsert.acknowledged).toBe(true);

        await scenarioDatabase.command({
          collMod: name,
          validator: candidateValidators.get(name),
          validationLevel: "moderate",
          validationAction: "error"
        });

        const newLegacyDocument = cloneDocument(scenarioDocument);
        newLegacyDocument._id = new ObjectId();

        const insertOutcome = await runCandidateOperation(
          () => collection.insertOne(newLegacyDocument)
        );
        const updateOutcome = await runCandidateOperation(
          () =>
            collection.updateOne(
              { _id: initialInsert.insertedId },
              update(scenarioDocument)
            )
        );

        if (insertOutcome.status === "accepted") {
          expect(insertOutcome.result.acknowledged).toBe(true);
        }

        if (updateOutcome.status === "accepted") {
          expect(updateOutcome.result.acknowledged).toBe(true);
          expect(updateOutcome.result.matchedCount).toBe(1);
          expect(updateOutcome.result.modifiedCount).toBe(1);
        }

        if (!intentionalBreak) {
          expect(insertOutcome.status).toBe("accepted");
          expect(updateOutcome.status).toBe("accepted");
          return;
        }

        expect([insertOutcome.status, updateOutcome.status]).toContain(
          "validation-rejected"
        );
      } finally {
        await scenarioDatabase.dropDatabase();
      }
    }
  );
});
