## Error Handling System

This codebase uses Spring Boot's `ResponseStatusException` as the primary error signaling mechanism, combined with a centralized `@RestControllerAdvice` exception handler for consistent HTTP error responses.

## Backend Architecture

### Core Components

**1. Centralized Exception Handler (`ApiExceptionHandler.java`)**
- Located at `backend/src/main/java/com/neetlu/examhunt/web/ApiExceptionHandler.java`
- Uses `@RestControllerAdvice` to intercept exceptions globally across all controllers
- Handles four exception categories:
  - `AuthenticationException` → 401 UNAUTHORIZED
  - `AccessDeniedException` → 403 FORBIDDEN
  - `ResponseStatusException` → returns the status code and reason from the exception
  - `IllegalStateException`, `IOException` → 400 BAD_REQUEST
- All responses return a uniform JSON structure: `{ "message": "<error description>" }`

**2. Service-Layer Error Signaling**
- Services throw `org.springframework.web.server.ResponseStatusException` with appropriate HTTP status codes
- No custom exception classes exist — the codebase relies entirely on Spring's built-in exception types
- Common patterns:
  ```java
  throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query q is required");
  throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found");
  throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
  throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
  throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
  throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI Tutor is in preview mode");
  ```

**3. Security Filter Error Handling**
- `JwtAuthFilter.java`: Catches `JwtException` silently (invalid tokens result in unauthenticated requests, not errors)
- `AdminKeyAuthFilter.java`: Standard servlet filter pattern with ServletException propagation
- Authentication failures flow through Spring Security's exception translation to `ApiExceptionHandler`

**4. Controller-Level Error Handling**
- Controllers do NOT use try-catch blocks for business logic errors
- One exception: `AdminPackController.deletePack()` catches `NoSuchElementException` and re-throws as `ResponseStatusException(NOT_FOUND)`
- Authorization checks delegated to `AdminAuthorization.requireAdminAccess()`, which throws `ResponseStatusException` directly

### HTTP Status Code Conventions

| Status | Usage |
|--------|-------|
| 400 BAD_REQUEST | Validation failures, missing required parameters, invalid input format |
| 401 UNAUTHORIZED | Missing/invalid authentication credentials, user not found |
| 403 FORBIDDEN | Authenticated user lacks required role/permission |
| 404 NOT_FOUND | Resource not found (questions, packs, users) |
| 409 CONFLICT | Duplicate resource creation (email already registered) |
| 503 SERVICE_UNAVAILABLE | Feature disabled or in preview mode |

## Frontend Error Handling

### API Client Layer (`frontend/src/api.ts`)

**1. Request Timeout Handling**
- All requests use `AbortController` with 25-second timeout
- Timeout errors produce user-friendly message: "Request timed out — the server may still be starting. Try again in a moment."
- Network failures produce: "Cannot reach server — if you restarted the backend, wait a few seconds and try again."

**2. HTTP Error Translation**
- Non-OK responses parsed for JSON body with `message` or `error` field
- Falls back to `formatHttpError()` for contextual messages:
  - 404 on auth endpoints → "Auth API not found — restart the backend"
  - 401 → "Please sign in again"
  - 403 on practice/auth → "Please sign in to use Practice and saved progress"
  - 403 general → CORS/proxy guidance for developers

**3. Request Deduplication**
- `getJsonCached()` coalesces duplicate GET requests within 8-second window
- Prevents double-fetch issues from React StrictMode

### Component-Level Error Handling

- Components use local `useState` for error display (e.g., `const [error, setError] = useState("")`)
- Try-catch blocks in async handlers capture errors and set local state
- Errors displayed inline via conditional rendering: `{error && <p className="error-text">{error}</p>}`
- No global ErrorBoundary component exists
- Import operations use polling with explicit error propagation: `throw new Error(job.error || job.message || "Import failed")`

## Developer Rules

1. **Services must throw `ResponseStatusException`** — never return null or use optional types for error conditions
2. **Use specific HTTP status codes** — match the semantic meaning (400 for validation, 401 for auth, 403 for authorization, 404 for missing resources)
3. **Provide descriptive error messages** — the message becomes the API response; make it actionable for frontend consumers
4. **Do not add try-catch in controllers** — let exceptions propagate to `ApiExceptionHandler` unless converting checked exceptions
5. **Frontend components handle errors locally** — use try-catch with setState for error display; no global error boundary
6. **Security filters swallow JWT exceptions** — invalid tokens result in anonymous requests, not error responses
7. **No custom exception hierarchy** — rely on Spring's standard exceptions and `ResponseStatusException` for all error cases