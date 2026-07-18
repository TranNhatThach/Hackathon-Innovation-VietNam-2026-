export function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env?.startsWith("http")) return env;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}
