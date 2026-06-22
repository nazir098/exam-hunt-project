# Adaptive Practice System

<cite>
**Referenced Files in This Document**
- [PracticeService.java](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java)
- [PracticeController.java](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java)
- [PracticeSession.java](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java)
- [QuestionAttempt.java](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java)
- [PracticeSessionRepository.java](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java)
- [SessionTiming.java](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java)
- [PracticeAiService.java](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java)
- [PracticeAiController.java](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeAiController.java)
- [AdminPracticeAiController.java](file://backend/src/main/java/com/neetlu/examhunt/web/AdminPracticeAiController.java)
- [PracticePage.tsx](file://frontend/src/pages/PracticePage.tsx)
- [PracticeQuestionPage.tsx](file://frontend/src/pages/PracticeQuestionPage.tsx)
- [SessionTimer.tsx](file://frontend/src/components/SessionTimer.tsx)
- [PracticeRecentSessions.tsx](file://frontend/src/components/PracticeRecentSessions.tsx)
- [practice.ts](file://frontend/src/utils/practice.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the adaptive practice system that powers personalized question selection, dynamic difficulty scaling, and intelligent session management. It covers how sessions are initiated, how questions are selected and presented, how answers are validated, and how progress is tracked and persisted. It also documents the adaptive algorithm, user progress analysis, and dynamic difficulty scaling, along with practical examples of the practice session lifecycle.

## Project Structure
The adaptive practice system spans backend services and frontend UI components:
- Backend Java services manage session lifecycle, adaptive algorithms, and analytics.
- MongoDB-backed models persist sessions and attempts.
- Frontend React components orchestrate user actions, session navigation, and progress visualization.

```mermaid
graph TB
subgraph "Backend"
PC["PracticeController<br/>REST endpoints"]
PS["PracticeService<br/>business logic"]
PAT["PracticeAiService<br/>LLM-powered insights"]
PSM["PracticeSession<br/>Mongo entity"]
QA["QuestionAttempt<br/>Mongo entity"]
PTR["PracticeSessionRepository<br/>Mongo repo"]
ST["SessionTiming<br/>expiry & engagement"]
end
subgraph "Frontend"
PP["PracticePage.tsx<br/>session creation UI"]
PQ["PracticeQuestionPage.tsx<br/>question presentation"]
PT["SessionTimer.tsx<br/>active time tracking"]
PRS["PracticeRecentSessions.tsx<br/>session history"]
end
PP --> PC
PQ --> PC
PC --> PS
PS --> PTR
PS --> PSM
PS --> QA
PS --> ST
PS --> PAT
PC --> PAT
PP --> PT
PP --> PRS
```

**Diagram sources**
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [PracticeService.java:60-89](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L60-L89)
- [PracticeAiService.java:161-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L161-L190)
- [PracticeSession.java:1-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L1-L228)
- [QuestionAttempt.java:1-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L1-L110)
- [PracticeSessionRepository.java:1-13](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java#L1-L13)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeQuestionPage.tsx:180-206](file://frontend/src/pages/PracticeQuestionPage.tsx#L180-L206)
- [SessionTimer.tsx:20-48](file://frontend/src/components/SessionTimer.tsx#L20-L48)
- [PracticeRecentSessions.tsx:104-132](file://frontend/src/components/PracticeRecentSessions.tsx#L104-L132)

**Section sources**
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [PracticeService.java:60-89](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L60-L89)
- [PracticeSession.java:1-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L1-L228)
- [QuestionAttempt.java:1-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L1-L110)
- [PracticeSessionRepository.java:1-13](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java#L1-L13)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeQuestionPage.tsx:180-206](file://frontend/src/pages/PracticeQuestionPage.tsx#L180-L206)
- [SessionTimer.tsx:20-48](file://frontend/src/components/SessionTimer.tsx#L20-L48)
- [PracticeRecentSessions.tsx:104-132](file://frontend/src/components/PracticeRecentSessions.tsx#L104-L132)

## Core Components
- PracticeSession: Tracks session metadata, question order, counts, adaptive level, and timing.
- QuestionAttempt: Stores individual answer submissions with correctness and marks.
- PracticeService: Implements session creation, adaptive ordering, engagement timing, submission handling, and result computation.
- PracticeController: Exposes REST endpoints for session lifecycle and question retrieval.
- SessionTiming: Manages session expiry and engagement-based active seconds.
- PracticeAiService: Provides AI-powered prompts and insights for practice.
- Frontend components: Drive user actions, session navigation, and progress display.

**Section sources**
- [PracticeSession.java:13-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L13-L228)
- [QuestionAttempt.java:15-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L15-L110)
- [PracticeService.java:60-89](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L60-L89)
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeAiService.java:161-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L161-L190)
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeQuestionPage.tsx:180-206](file://frontend/src/pages/PracticeQuestionPage.tsx#L180-L206)

## Architecture Overview
The system follows a layered architecture:
- Presentation layer (frontend) handles user interactions and renders UI.
- Application layer (controllers/services) implements domain logic.
- Persistence layer (MongoDB) stores sessions and attempts.
- AI layer (PracticeAiService) augments practice with contextual prompts.

```mermaid
graph TB
UI["React UI<br/>PracticePage, PracticeQuestionPage, SessionTimer"] --> API["REST API<br/>PracticeController"]
API --> SVC["Service Layer<br/>PracticeService"]
SVC --> REPO["Repositories<br/>PracticeSessionRepository"]
SVC --> MODEL["Domain Models<br/>PracticeSession, QuestionAttempt"]
SVC --> TIMER["SessionTiming<br/>Expiry & Engagement"]
SVC --> AI["PracticeAiService<br/>LLM Prompts"]
MODEL --> DB["MongoDB Collections"]
AI --> LLM["FreeLlmClient"]
```

**Diagram sources**
- [PracticeController.java:21-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L21-L141)
- [PracticeService.java:26-1238](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L26-L1238)
- [PracticeSessionRepository.java:9-12](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java#L9-L12)
- [PracticeSession.java:13-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L13-L228)
- [QuestionAttempt.java:15-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L15-L110)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeAiService.java:161-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L161-L190)

## Detailed Component Analysis

### Adaptive Difficulty Adjustment and Intelligent Question Selection
The adaptive system dynamically selects questions around a target difficulty level derived from user performance. It ensures the next question aligns with the current adaptive level while maintaining session order integrity.

```mermaid
flowchart TD
Start(["Answered Question"]) --> Compute["Compute Next Target Level"]
Compute --> Clamp["Clamp to [1..3]"]
Clamp --> Reorder["Re-sort Remaining Questions by |difficulty - target|"]
Reorder --> Persist["Persist Updated Question Order"]
Persist --> NextQ["Serve Next Question"]
```

**Diagram sources**
- [PracticeService.java:712-730](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L712-L730)
- [PracticeService.java:708-710](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L708-L710)

Implementation highlights:
- Difficulty parsing and matching helpers ensure filters are normalized and applied consistently.
- The adaptive reordering sorts the remainder of the question list by proximity to the target difficulty.
- The adaptive level is clamped to valid bounds to prevent out-of-range difficulties.

**Section sources**
- [PracticeService.java:665-694](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L665-L694)
- [PracticeService.java:708-730](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L708-L730)

### Practice Session Lifecycle
The lifecycle spans creation, engagement, progression, and completion.

```mermaid
sequenceDiagram
participant User as "User"
participant FE as "Frontend"
participant API as "PracticeController"
participant SVC as "PracticeService"
participant DB as "MongoDB"
User->>FE : "Start Practice"
FE->>API : "POST /api/practice/sessions"
API->>SVC : "createSession(req)"
SVC->>DB : "save(PracticeSession)"
DB-->>SVC : "saved session"
SVC-->>API : "SessionView"
API-->>FE : "SessionView"
User->>FE : "Open Question"
FE->>API : "POST /api/practice/sessions/{id}/engage"
API->>SVC : "engageSession(userId, sessionId)"
SVC->>DB : "update activeSeconds/engagedSince"
DB-->>SVC : "updated session"
SVC-->>API : "SessionView"
API-->>FE : "SessionView"
User->>FE : "Submit Answer"
FE->>API : "POST /api/practice/sessions/{id}/submit"
API->>SVC : "submitAnswer(req)"
SVC->>DB : "save(QuestionAttempt)"
SVC->>DB : "update PracticeSession"
DB-->>SVC : "persisted"
SVC-->>API : "SubmitResult"
API-->>FE : "SubmitResult"
User->>FE : "Finish Session"
FE->>API : "POST /api/practice/sessions/{id}/finish"
API->>SVC : "finishSession(userId, sessionId)"
SVC->>DB : "setStatus='completed', completedAt"
DB-->>SVC : "updated session"
SVC-->>API : "SessionResultView"
API-->>FE : "SessionResultView"
```

**Diagram sources**
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [PracticeService.java:60-89](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L60-L89)
- [PracticeService.java:732-753](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L732-L753)
- [PracticeService.java:808-825](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L808-L825)

Key lifecycle steps:
- Session creation initializes filters, question order, adaptive level, and scoring.
- Engagement toggles maintain accurate active time tracking.
- Submission updates counts, marks, and adaptive level.
- Completion computes results, persists session state, and triggers follow-up tasks.

**Section sources**
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [PracticeService.java:60-89](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L60-L89)
- [PracticeService.java:732-753](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L732-L753)
- [PracticeService.java:808-825](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L808-L825)

### Attempt Tracking and Marks Calculation
Each answer submission creates a QuestionAttempt and updates session metrics. Marks are computed considering AI variants and session mode.

```mermaid
flowchart TD
Submit["Submit Answer"] --> Validate["Normalize Selected Answer"]
Validate --> Compare{"Correct?"}
Compare --> |Yes| Award["Award Marks"]
Compare --> |No| Zero["Zero Marks (AI variants in practice)"]
Award --> UpdateSession["Update Counts & Total Marks"]
Zero --> UpdateSession
UpdateSession --> Adaptive["Adjust Adaptive Level"]
Adaptive --> Persist["Persist Attempt & Session"]
```

**Diagram sources**
- [PracticeService.java:364-397](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L364-L397)
- [PracticeService.java:215-220](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L215-L220)

Behavioral notes:
- AI variant drills in practice mode do not contribute to marks or analytics.
- Test mode suppresses answer visibility and solution details in SubmitResult.

**Section sources**
- [PracticeService.java:196-220](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L196-L220)
- [PracticeService.java:364-397](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L364-L397)

### Dynamic Difficulty Scaling and Recommendation
The system maintains an internal adaptive level (1–3) and reorders remaining questions to approach the target difficulty. It also supports AI-driven insights for weak areas and similar questions.

```mermaid
classDiagram
class PracticeSession {
+int adaptiveLevel
+String[] questionIds
+int currentIndex
+int correctCount
+int wrongCount
+int totalMarks
+int maxMarks
}
class PracticeService {
+reorderRemainingByAdaptive(session, answeredQuestionId)
+clampAdaptive(level)
}
class PracticeAiService {
+resolvePrompt(userId, feature, questionId, selectedAnswer)
+assist(userId, request)
}
PracticeService --> PracticeSession : "updates"
PracticeAiService --> PracticeSession : "augments insights"
```

**Diagram sources**
- [PracticeSession.java:23-106](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L23-L106)
- [PracticeService.java:708-730](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L708-L730)
- [PracticeAiService.java:1546-1561](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L1546-L1561)

**Section sources**
- [PracticeSession.java:23-106](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L23-L106)
- [PracticeService.java:708-730](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L708-L730)
- [PracticeAiService.java:1546-1561](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L1546-L1561)

### Session Management and Timing
Session timing integrates engagement windows and idle expiry to compute active seconds and enforce session limits.

```mermaid
flowchart TD
Engage["engageSession()"] --> SetEngaged["Set engagedSince"]
SetEngaged --> Save["Save Session"]
Pause["pauseSession()"] --> Flush["flushEngagement()"]
Flush --> Update["Update activeSeconds & lastDisengagedAt"]
Update --> Save
Expire["expiryReason()"] --> CheckAge{"MAX_AGE exceeded?"}
CheckAge --> |Yes| MarkExpired["ExpiryReason.MAX_AGE"]
CheckAge --> |No| CheckActive{"MAX_ACTIVE exceeded?"}
CheckActive --> |Yes| MarkExpired
CheckActive --> |No| CheckIdle{"AWAY_IDLE exceeded?"}
CheckIdle --> |Yes| MarkExpired
CheckIdle --> |No| NoExpiry["No expiry"]
```

**Diagram sources**
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeService.java:732-753](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L732-L753)

**Section sources**
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeService.java:732-753](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L732-L753)

### Frontend Integration Examples
- Starting a practice session: The frontend composes filters, validates pack availability, and requests a session from the backend.
- Presenting a question: The frontend loads question content and manages answer submission and review.
- Timer display: The frontend computes elapsed time based on activeSeconds and engagedSince.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant API as "PracticeController"
participant SVC as "PracticeService"
FE->>API : "POST /api/practice/sessions"
API->>SVC : "createSession(req)"
SVC-->>API : "SessionView"
API-->>FE : "SessionView"
FE->>API : "GET /api/practice/questions/{id}"
API-->>FE : "QuestionPracticeView"
FE->>API : "POST /api/practice/sessions/{id}/engage"
API->>SVC : "engageSession()"
SVC-->>API : "SessionView"
API-->>FE : "SessionView"
```

**Diagram sources**
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeQuestionPage.tsx:180-206](file://frontend/src/pages/PracticeQuestionPage.tsx#L180-L206)
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)

**Section sources**
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeQuestionPage.tsx:180-206](file://frontend/src/pages/PracticeQuestionPage.tsx#L180-L206)
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)

## Dependency Analysis
The system exhibits clear separation of concerns:
- Controllers depend on services for business logic.
- Services depend on repositories and models for persistence.
- AI service depends on platform settings and LLM client.
- Frontend components depend on backend APIs and local utilities.

```mermaid
graph LR
PC["PracticeController"] --> PS["PracticeService"]
PS --> PTR["PracticeSessionRepository"]
PS --> PSM["PracticeSession"]
PS --> QA["QuestionAttempt"]
PS --> ST["SessionTiming"]
PS --> PAT["PracticeAiService"]
FE["Frontend Pages/Components"] --> PC
FE --> PAT
```

**Diagram sources**
- [PracticeController.java:21-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L21-L141)
- [PracticeService.java:26-1238](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L26-L1238)
- [PracticeSessionRepository.java:9-12](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java#L9-L12)
- [PracticeSession.java:13-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L13-L228)
- [QuestionAttempt.java:15-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L15-L110)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeAiService.java:161-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L161-L190)

**Section sources**
- [PracticeController.java:21-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L21-L141)
- [PracticeService.java:26-1238](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L26-L1238)
- [PracticeSessionRepository.java:9-12](file://backend/src/main/java/com/neetlu/examhunt/repository/PracticeSessionRepository.java#L9-L12)
- [PracticeSession.java:13-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L13-L228)
- [QuestionAttempt.java:15-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L15-L110)
- [SessionTiming.java:30-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L30-L69)
- [PracticeAiService.java:161-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L161-L190)

## Performance Considerations
- Adaptive reordering operates on the remainder of the question list; keep session sizes reasonable to minimize sort overhead.
- Use pagination and filtering to limit question pool size during session creation.
- Persist engagement segments efficiently to avoid excessive writes.
- Offload non-critical analytics computations asynchronously.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Session not found: Ensure the authenticated user owns the session ID.
- Session expired: Sessions may expire due to age, active time cap, or extended idle periods.
- No questions match filters: Verify filters and question set configuration.
- AI prompts disabled: Confirm platform settings and LLM configuration.

**Section sources**
- [PracticeService.java:222-226](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L222-L226)
- [SessionTiming.java:42-69](file://backend/src/main/java/com/neetlu/examhunt/service/SessionTiming.java#L42-L69)
- [PracticeAiService.java:180-190](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeAiService.java#L180-L190)

## Conclusion
The adaptive practice system combines a robust session lifecycle, dynamic difficulty scaling, and AI-enhanced insights to deliver a personalized learning experience. Its modular design separates concerns cleanly, enabling scalable enhancements and reliable persistence of user progress.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Example Workflows

- Practice session initiation
  - Frontend composes filters and requests a session.
  - Backend validates filters, builds question order, and persists the session.
  - Frontend navigates to the first question.

- Question presentation and answer validation
  - Frontend loads question content.
  - On submission, backend compares normalized answers, updates counts and marks, adjusts adaptive level, and returns results.

- Session completion
  - Frontend requests completion.
  - Backend computes results, persists state, and returns a comprehensive result view.

**Section sources**
- [PracticePage.tsx:45-98](file://frontend/src/pages/PracticePage.tsx#L45-L98)
- [PracticeController.java:31-141](file://backend/src/main/java/com/neetlu/examhunt/web/PracticeController.java#L31-L141)
- [PracticeService.java:364-397](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L364-L397)
- [PracticeService.java:808-825](file://backend/src/main/java/com/neetlu/examhunt/service/PracticeService.java#L808-L825)

### Data Models Overview

```mermaid
erDiagram
PRACTICE_SESSION {
string id PK
string userId
string exam
string packId
int adaptiveLevel
int correctCount
int wrongCount
int skipCount
int totalMarks
int maxMarks
string status
int activeSeconds
int startedAt
int completedAt
int currentIndex
}
QUESTION_ATTEMPT {
string id PK
string userId
string sessionId
string questionId
string selectedAnswer
boolean correct
int marksAwarded
string mode
int answeredAt
}
PRACTICE_SESSION ||--o{ QUESTION_ATTEMPT : "attempts"
```

**Diagram sources**
- [PracticeSession.java:13-228](file://backend/src/main/java/com/neetlu/examhunt/model/PracticeSession.java#L13-L228)
- [QuestionAttempt.java:15-110](file://backend/src/main/java/com/neetlu/examhunt/model/QuestionAttempt.java#L15-L110)