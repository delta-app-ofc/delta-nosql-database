import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { DEFAULT_MONGODB_URI } from "./mongo-client.js";

export function runMongosh(
  scriptPath,
  uri = process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI
) {
  if (!scriptPath) {
    throw new TypeError("O caminho do script mongosh é obrigatório.");
  }

  const absoluteScriptPath = resolve(scriptPath);

  // Usa um subprocesso para executar o script original, sem reimplementá-lo.
  return new Promise((resolveExecution, rejectExecution) => {
    const child = spawn("mongosh", [uri, absoluteScriptPath], {
      shell: false,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    // `error` indica que o processo nem conseguiu iniciar, por exemplo sem mongosh no PATH.
    child.once("error", (cause) => {
      const error = new Error(
        `Não foi possível iniciar o mongosh para executar "${absoluteScriptPath}": ${cause.message}`,
        { cause }
      );

      error.stdout = stdout;
      error.stderr = stderr;
      rejectExecution(error);
    });

    // `close` informa o código final: zero significa execução bem-sucedida.
    child.once("close", (exitCode, signal) => {
      if (exitCode === 0) {
        resolveExecution({
          stdout,
          stderr,
          scriptPath: absoluteScriptPath
        });
        return;
      }

      const outputDetails = [
        `O mongosh falhou ao executar "${absoluteScriptPath}".`,
        `Código de saída: ${exitCode ?? "indisponível"}.`,
        `Sinal: ${signal ?? "nenhum"}.`,
        `stdout:\n${stdout.trim() || "(vazio)"}`,
        `stderr:\n${stderr.trim() || "(vazio)"}`
      ].join("\n");
      const error = new Error(outputDetails);

      error.exitCode = exitCode;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      rejectExecution(error);
    });
  });
}
