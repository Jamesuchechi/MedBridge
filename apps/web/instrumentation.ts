import * as Sentry from "@sentry/nextjs";

export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://placeholder@sentry.io/medbridge",
      tracesSampleRate: 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://placeholder@sentry.io/medbridge",
      tracesSampleRate: 1.0,
      debug: false,
    });
  }
}
