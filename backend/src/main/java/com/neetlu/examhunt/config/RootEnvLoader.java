package com.neetlu.examhunt.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads {@code .env} from the monorepo root when the API is started from {@code backend/}
 * without {@code source .env}. Spring does not read .env files automatically.
 */
public final class RootEnvLoader {

    private static final String MONGODB_URI = "MONGODB_URI";
    private static final String PUBLIC_FILES_BASE_URL = "PUBLIC_FILES_BASE_URL";
    private static final String R2_PUBLIC_BASE_URL = "R2_PUBLIC_BASE_URL";

    private RootEnvLoader() {}

    /** @return Spring default properties from root .env (only keys not already in the OS env). */
    public static Map<String, Object> loadDefaults() {
        Map<String, Object> defaults = new HashMap<>();
        for (Path candidate : List.of(Path.of("..", ".env"), Path.of(".env"))) {
            if (!Files.isRegularFile(candidate)) {
                continue;
            }
            try {
                for (String raw : Files.readAllLines(candidate)) {
                    String line = raw.strip();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eq = line.indexOf('=');
                    if (eq <= 0) {
                        continue;
                    }
                    String key = line.substring(0, eq).strip();
                    if (key.isEmpty() || System.getenv(key) != null) {
                        continue;
                    }
                    String value = unquote(line.substring(eq + 1).strip());
                    defaults.put(key, value);
                    if (MONGODB_URI.equals(key)) {
                        defaults.put("spring.data.mongodb.uri", value);
                    }
                    if (PUBLIC_FILES_BASE_URL.equals(key) || R2_PUBLIC_BASE_URL.equals(key)) {
                        defaults.put("app.public-files-base-url", value);
                    }
                }
            } catch (IOException ignored) {
                // Fall back to application.yml defaults
            }
            break;
        }
        return defaults;
    }

    private static String unquote(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
