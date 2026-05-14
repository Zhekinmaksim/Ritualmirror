const defaultWorkerUrl = "http://127.0.0.1:8787";

export function workerBaseUrl() {
  return process.env.RITUAL_WORKER_URL?.replace(/\/$/, "");
}

export function localWorkerBaseUrl() {
  return defaultWorkerUrl;
}
