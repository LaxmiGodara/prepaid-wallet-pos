interface RequiredConfig {
  key: string;
  label: string;
  minLength?: number;
}

const REQUIRED_ENV_VARS: RequiredConfig[] = [
  {
    key: "MONGODB_URI",
    label: "MongoDB URI",
  },
  {
    key: "JWT_SECRET",
    label: "JWT Secret",
    minLength: 16,
  },
  {
    key: "JWT_EXPIRES_IN",
    label: "JWT Expiry Duration",
  },
];

export function validateRuntimeConfig(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const config of REQUIRED_ENV_VARS) {
    const value = process.env[config.key];

    if (!value) {
      missing.push(`  - ${config.label} (${config.key})`);
      continue;
    }

    if (config.minLength !== undefined && value.length < config.minLength) {
      invalid.push(
        `  - ${config.label} (${config.key}) must be at least ${config.minLength} characters. ` +
          `Current length: ${value.length}`,
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      "Missing required environment variables:\n" +
        missing.join("\n") +
        "\n\nAdd these to your .env.local file and restart the server.",
    );
  }

  if (invalid.length > 0) {
    throw new Error(
      "Invalid environment variable values:\n" +
        invalid.join("\n") +
        "\n\nUpdate these values in your .env.local file and restart the server.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log("✓ Runtime configuration validated");
  }
}
