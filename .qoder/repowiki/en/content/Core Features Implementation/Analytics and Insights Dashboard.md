# Analytics and Insights Dashboard

<cite>
**Referenced Files in This Document**
- [AnalyticsEvent.java](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java)
- [AnalyticsEventRepository.java](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java)
- [ProductAnalyticsService.java](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java)
- [ProductAnalyticsController.java](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java)
- [AnalyticsProperties.java](file://backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java)
- [LeaderboardService.java](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java)
- [LeaderboardController.java](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java)
- [AnalyticsPage.tsx](file://frontend/src/pages/AnalyticsPage.tsx)
- [AnalyticsDashboard.tsx](file://frontend/src/components/AnalyticsDashboard.tsx)
- [analyticsDashboard.ts](file://frontend/src/utils/analyticsDashboard.ts)
- [analyticsInsights.ts](file://frontend/src/utils/analyticsInsights.ts)
- [analyticsPreview.ts](file://frontend/src/utils/analyticsPreview.ts)
- [weakChapters.ts](file://frontend/src/utils/weakChapters.ts)
- [leaderboardDisplay.ts](file://frontend/src/utils/leaderboardDisplay.ts)
- [DashboardPerformanceSnapshot.tsx](file://frontend/src/components/DashboardPerformanceSnapshot.tsx)
- [analytics.ts](file://frontend/src/analytics.ts)
- [api.ts](file://frontend/src/api.ts)
- [LeaderboardPage.tsx](file://frontend/src/pages/LeaderboardPage.tsx)
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
This document explains the analytics and insights dashboard system, covering performance tracking, weak area identification, leaderboard implementation, and data visualization. It documents how analytics events are collected, aggregated, and surfaced into actionable insights. It also describes the leaderboard algorithms, ranking systems, and gamification elements, along with practical examples of dashboard components, analytics queries, and performance reporting. The integration between backend analytics services and frontend visualization components is explained, including data aggregation, real-time-like updates, and user insights generation.

## Project Structure
The analytics and insights system spans both backend and frontend layers:
- Backend: MongoDB-backed analytics ingestion and aggregation, plus leaderboard computation via MongoDB aggregation.
- Frontend: Dashboard pages and components that render charts, trends, weak areas, mistakes, and leaderboard views.

```mermaid
graph TB
subgraph "Frontend"
FE_A["AnalyticsPage.tsx"]
FE_Dash["AnalyticsDashboard.tsx"]
FE_Utils1["analyticsDashboard.ts"]
FE_Utils2["analyticsInsights.ts"]
FE_Utils3["analyticsPreview.ts"]
FE_Utils4["weakChapters.ts"]
FE_Utils5["leaderboardDisplay.ts"]
FE_API["api.ts"]
FE_An["analytics.ts"]
FE_LB["LeaderboardPage.tsx"]
end
subgraph "Backend"
BE_Cfg["AnalyticsProperties.java"]
BE_Model["AnalyticsEvent.java"]
BE_Repo["AnalyticsEventRepository.java"]
BE_Svc["ProductAnalyticsService.java"]
BE_LeaderSvc["LeaderboardService.java"]
BE_Ctrl["ProductAnalyticsController.java"]
BE_LBCtrl["LeaderboardController.java"]
end
FE_A --> FE_Dash
FE_Dash --> FE_Utils1
FE_Dash --> FE_Utils2
FE_Dash --> FE_Utils3
FE_Dash --> FE_Utils4
FE_Dash --> FE_API
FE_An --> FE_API
FE_LB --> FE_Utils5
FE_LB --> FE_API
FE_API --> BE_Ctrl
BE_Ctrl --> BE_Svc
BE_Svc --> BE_Repo
BE_Svc --> BE_Model
BE_Svc --> BE_Cfg
FE_API --> BE_LBCtrl
BE_LBCtrl --> BE_LeaderSvc
```

**Diagram sources**
- [AnalyticsPage.tsx:1-58](file://frontend/src/pages/AnalyticsPage.tsx#L1-L58)
- [AnalyticsDashboard.tsx:1-433](file://frontend/src/components/AnalyticsDashboard.tsx#L1-L433)
- [analyticsDashboard.ts:1-204](file://frontend/src/utils/analyticsDashboard.ts#L1-L204)
- [analyticsInsights.ts:1-115](file://frontend/src/utils/analyticsInsights.ts#L1-L115)
- [analyticsPreview.ts:1-159](file://frontend/src/utils/analyticsPreview.ts#L1-L159)
- [weakChapters.ts:1-38](file://frontend/src/utils/weakChapters.ts#L1-L38)
- [leaderboardDisplay.ts:1-43](file://frontend/src/utils/leaderboardDisplay.ts#L1-L43)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)
- [analytics.ts:40-182](file://frontend/src/analytics.ts#L40-L182)
- [LeaderboardPage.tsx:1-367](file://frontend/src/pages/LeaderboardPage.tsx#L1-L367)
- [AnalyticsProperties.java:1-7](file://backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java#L1-L7)
- [AnalyticsEvent.java:1-83](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java#L1-L83)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)
- [LeaderboardController.java:1-28](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java#L1-L28)

**Section sources**
- [AnalyticsPage.tsx:1-58](file://frontend/src/pages/AnalyticsPage.tsx#L1-L58)
- [AnalyticsDashboard.tsx:1-433](file://frontend/src/components/AnalyticsDashboard.tsx#L1-L433)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)

## Core Components
- Analytics event model and repository define the schema and query surface for analytics events stored in MongoDB.
- Product analytics service handles ingestion, sanitization, and summary computation for product analytics.
- Product analytics controller exposes a POST endpoint to accept client-side events.
- Leaderboard service computes rankings, stats, and recent activity using MongoDB aggregation.
- Leaderboard controller exposes a GET endpoint to fetch leaderboard data.
- Frontend dashboard page and components render performance trends, weak areas, mistakes, and insights.
- Utilities compute trends, gauges, insights, and leaderboard display helpers.
- Analytics client tracks and batches events, sending them to the backend.

**Section sources**
- [AnalyticsEvent.java:1-83](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java#L1-L83)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)
- [LeaderboardController.java:1-28](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java#L1-L28)
- [AnalyticsPage.tsx:1-58](file://frontend/src/pages/AnalyticsPage.tsx#L1-L58)
- [AnalyticsDashboard.tsx:1-433](file://frontend/src/components/AnalyticsDashboard.tsx#L1-L433)
- [analyticsDashboard.ts:1-204](file://frontend/src/utils/analyticsDashboard.ts#L1-L204)
- [analyticsInsights.ts:1-115](file://frontend/src/utils/analyticsInsights.ts#L1-L115)
- [analyticsPreview.ts:1-159](file://frontend/src/utils/analyticsPreview.ts#L1-L159)
- [weakChapters.ts:1-38](file://frontend/src/utils/weakChapters.ts#L1-L38)
- [leaderboardDisplay.ts:1-43](file://frontend/src/utils/leaderboardDisplay.ts#L1-L43)
- [analytics.ts:40-182](file://frontend/src/analytics.ts#L40-L182)

## Architecture Overview
The analytics pipeline collects events from the client, sanitizes and persists them server-side, and exposes summaries and leaderboards consumed by the frontend.

```mermaid
sequenceDiagram
participant Client as "Browser"
participant FE as "Frontend Analytics Client (analytics.ts)"
participant API as "Frontend API (api.ts)"
participant Ctrl as "ProductAnalyticsController"
participant Svc as "ProductAnalyticsService"
participant Repo as "AnalyticsEventRepository/MongoDB"
Client->>FE : "trackEvent(...)"
FE->>API : "queue event"
API->>Ctrl : "POST /api/analytics/events"
Ctrl->>Svc : "ingest(userId, sessionId, events)"
Svc->>Repo : "saveAll(docs)"
Repo-->>Svc : "ack"
Svc-->>Ctrl : "ok"
Ctrl-->>API : "204 No Content"
API-->>FE : "ack"
```

**Diagram sources**
- [analytics.ts:40-182](file://frontend/src/analytics.ts#L40-L182)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)

## Detailed Component Analysis

### Analytics Event Model and Repository
- Model defines indexed fields for efficient querying by event name and creation time, and includes optional path and properties metadata.
- Repository provides count and paginated retrieval helpers for recent events.

```mermaid
classDiagram
class AnalyticsEvent {
+String id
+String name
+String userId
+String sessionId
+String path
+Map~String,Object~ properties
+Instant createdAt
}
class AnalyticsEventRepository {
+countByCreatedAtAfter(since) long
+countByNameAndCreatedAtAfter(name,since) long
+findTop500ByCreatedAtAfterOrderByCreatedAtDesc(since) AnalyticsEvent[]
}
AnalyticsEventRepository ..> AnalyticsEvent : "persists"
```

**Diagram sources**
- [AnalyticsEvent.java:1-83](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java#L1-L83)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)

**Section sources**
- [AnalyticsEvent.java:1-83](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java#L1-L83)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)

### Product Analytics Service and Controller
- Service ingests sanitized events, limits batch size, and stores them with sanitized properties and path.
- Provides a summary view aggregating top events, unique sessions, and daily page views for a configurable window.
- Controller accepts a batch of events and delegates ingestion to the service.

```mermaid
flowchart TD
Start(["Ingest Entry"]) --> CheckEnabled["Check events enabled"]
CheckEnabled --> |Disabled| Exit["Return"]
CheckEnabled --> |Enabled| SanitizeSession["Sanitize sessionId"]
SanitizeSession --> LimitBatch["Limit batch to 20"]
LimitBatch --> ForEach["For each EventInput"]
ForEach --> ValidateName["Validate name length and blankness"]
ValidateName --> |Invalid| Next["Skip"]
ValidateName --> |Valid| BuildDoc["Build AnalyticsEvent"]
BuildDoc --> SanitizeProps["Sanitize properties (<=20, keys<=64, values<=256)"]
SanitizeProps --> SetPath["Set path if present"]
SetPath --> AddToDocs["Add to docs list"]
AddToDocs --> Save["SaveAll(docs)"]
Save --> Exit
```

**Diagram sources**
- [ProductAnalyticsService.java:36-69](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L36-L69)
- [ProductAnalyticsService.java:105-128](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L105-L128)

**Section sources**
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)

### Leaderboard Service and Controller
- Computes rankings by total marks, then correctness count, then attempts count (ascending).
- Supports weekly/monthly/all-time periods with a normalized period window.
- Aggregates period totals (scholars, total marks, attempts, correct, accuracy) and recent activity.
- Returns a response containing entries, personal entry, total players, stats, and recent activity.

```mermaid
flowchart TD
LBStart(["Leaderboard Entry"]) --> Normalize["Normalize period (weekly/monthly/all)"]
Normalize --> Since["Compute periodStart"]
Since --> Aggregate["Aggregate ranked users (group by userId)"]
Aggregate --> LoadAccounts["Load user accounts"]
LoadAccounts --> MapEntries["Map to LeaderboardEntry (rank, stats, you flag)"]
MapEntries --> Totals["Aggregate period totals"]
Totals --> AllTime["Aggregate all-time totals"]
AllTime --> Stats["Build LeaderboardStats"]
Stats --> Activity["Fetch recent activity (last N)"]
Activity --> ReturnLB["Return LeaderboardResponse"]
```

**Diagram sources**
- [LeaderboardService.java:40-77](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L40-L77)
- [LeaderboardService.java:85-115](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L85-L115)
- [LeaderboardService.java:117-148](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L117-L148)
- [LeaderboardController.java:20-26](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java#L20-L26)

**Section sources**
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)
- [LeaderboardController.java:1-28](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java#L1-L28)

### Frontend Analytics Dashboard
- Renders tabs for Overview, Performance, Subjects, Chapters, Weak Areas, Mistakes, Tests.
- Uses utilities to compute accuracy trends, question trends, weekly activity cells, subject gauges, and mistake segments.
- Displays insights cards and a “focus area” recommendation based on weak chapters.

```mermaid
graph TB
Dash["AnalyticsDashboard.tsx"]
Utils1["analyticsDashboard.ts<br/>accuracyTrendPoints, questionsTrendPoints,<br/>buildFourSubjectGauges, mistakeSegments"]
Utils2["analyticsInsights.ts<br/>buildAnalyticsInsights"]
Utils3["analyticsPreview.ts<br/>demo data"]
Utils4["weakChapters.ts<br/>primaryWeakChapter"]
Dash --> Utils1
Dash --> Utils2
Dash --> Utils3
Dash --> Utils4
```

**Diagram sources**
- [AnalyticsDashboard.tsx:137-433](file://frontend/src/components/AnalyticsDashboard.tsx#L137-L433)
- [analyticsDashboard.ts:1-204](file://frontend/src/utils/analyticsDashboard.ts#L1-L204)
- [analyticsInsights.ts:1-115](file://frontend/src/utils/analyticsInsights.ts#L1-L115)
- [analyticsPreview.ts:1-159](file://frontend/src/utils/analyticsPreview.ts#L1-L159)
- [weakChapters.ts:1-38](file://frontend/src/utils/weakChapters.ts#L1-L38)

**Section sources**
- [AnalyticsDashboard.tsx:1-433](file://frontend/src/components/AnalyticsDashboard.tsx#L1-L433)
- [analyticsDashboard.ts:1-204](file://frontend/src/utils/analyticsDashboard.ts#L1-L204)
- [analyticsInsights.ts:1-115](file://frontend/src/utils/analyticsInsights.ts#L1-L115)
- [analyticsPreview.ts:1-159](file://frontend/src/utils/analyticsPreview.ts#L1-L159)
- [weakChapters.ts:1-38](file://frontend/src/utils/weakChapters.ts#L1-L38)

### Leaderboard Frontend and Gamification
- Renders leaderboard entries with avatars, ranks, scores, and trend indicators.
- Provides filtering, podium layout, and display helpers for points formatting and mastery labels.
- Integrates with leaderboard APIs to show weekly/monthly/all-time views.

```mermaid
sequenceDiagram
participant Page as "LeaderboardPage.tsx"
participant API as "api.ts"
participant Utils as "leaderboardDisplay.ts"
Page->>API : "fetchLeaderboard(limit, period)"
API-->>Page : "LeaderboardResponse"
Page->>Utils : "formatLeaderboardPts, avatarHue, podiumSlots"
Utils-->>Page : "formatted display values"
Page-->>Page : "render entries, stats, activity"
```

**Diagram sources**
- [LeaderboardPage.tsx:334-367](file://frontend/src/pages/LeaderboardPage.tsx#L334-L367)
- [leaderboardDisplay.ts:1-43](file://frontend/src/utils/leaderboardDisplay.ts#L1-L43)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)

**Section sources**
- [LeaderboardPage.tsx:1-367](file://frontend/src/pages/LeaderboardPage.tsx#L1-L367)
- [leaderboardDisplay.ts:1-43](file://frontend/src/utils/leaderboardDisplay.ts#L1-L43)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)

## Dependency Analysis
- Backend depends on Spring Data MongoDB for repository operations and aggregation.
- Analytics service depends on configuration to gate ingestion.
- Frontend depends on typed API responses and utility modules for rendering.

```mermaid
graph LR
FE_API["api.ts"] --> BE_CTRL["ProductAnalyticsController"]
FE_API --> BE_LBCTRL["LeaderboardController"]
BE_CTRL --> BE_SVC["ProductAnalyticsService"]
BE_SVC --> BE_REPO["AnalyticsEventRepository"]
BE_SVC --> BE_MODEL["AnalyticsEvent"]
BE_SVC --> BE_CFG["AnalyticsProperties"]
BE_LBCTRL --> BE_LEADERSVC["LeaderboardService"]
```

**Diagram sources**
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)
- [LeaderboardController.java:1-28](file://backend/src/main/java/com/neetlu/examhunt/web/LeaderboardController.java#L1-L28)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)
- [AnalyticsEventRepository.java:1-17](file://backend/src/main/java/com/neetlu/examhunt/repository/AnalyticsEventRepository.java#L1-L17)
- [AnalyticsEvent.java:1-83](file://backend/src/main/java/com/neetlu/examhunt/model/AnalyticsEvent.java#L1-L83)
- [AnalyticsProperties.java:1-7](file://backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java#L1-L7)

**Section sources**
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)
- [LeaderboardService.java:1-372](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L1-L372)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)

## Performance Considerations
- Event ingestion is batch-limited to reduce write amplification and memory pressure.
- Indexes on event name and creation time enable fast summarization and recent-event queries.
- Aggregation sorts by multiple fields to produce fair, deterministic rankings.
- Frontend computations rely on memoization and precomputed utilities to minimize re-renders.
- Real-time updates are approximated via periodic polling and client-side batching.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Analytics ingestion disabled: Verify configuration property enabling events.
- Empty leaderboard: Ensure practice-mode attempts exist and are within the selected period.
- Missing trends: Confirm sufficient sessions exist within the chart window.
- Guest preview data: Demo datasets are used when no user progress is available.

**Section sources**
- [AnalyticsProperties.java:1-7](file://backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java#L1-L7)
- [ProductAnalyticsService.java:36-69](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L36-L69)
- [LeaderboardService.java:175-192](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L175-L192)
- [analyticsPreview.ts:1-159](file://frontend/src/utils/analyticsPreview.ts#L1-L159)

## Conclusion
The analytics and insights dashboard integrates client-side event tracking with robust backend ingestion and aggregation, delivering performance trends, weak area identification, and a dynamic leaderboard. The frontend components transform raw data into actionable insights, while backend services ensure scalable computation and fair ranking. Together, they form a cohesive system for tracking learning progress and motivating continued engagement.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Analytics Event Collection Workflow
- Client-side tracking queues events and flushes them to the backend.
- Backend controller validates and delegates ingestion to the service.
- Service sanitizes inputs, persists events, and supports summary queries.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant API as "api.ts"
participant CTRL as "ProductAnalyticsController"
participant SVC as "ProductAnalyticsService"
participant REPO as "MongoDB"
FE->>API : "trackEvent(...)"
API->>CTRL : "POST /api/analytics/events"
CTRL->>SVC : "ingest(userId, sessionId, events)"
SVC->>REPO : "saveAll(docs)"
REPO-->>SVC : "ack"
SVC-->>CTRL : "ok"
CTRL-->>API : "204 No Content"
```

**Diagram sources**
- [analytics.ts:40-182](file://frontend/src/analytics.ts#L40-L182)
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)
- [ProductAnalyticsController.java:1-41](file://backend/src/main/java/com/neetlu/examhunt/web/ProductAnalyticsController.java#L1-L41)
- [ProductAnalyticsService.java:1-154](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L1-L154)

### Leaderboard Ranking Algorithm
- Sort by total marks (desc), correctness count (desc), attempts count (asc).
- Compute weekly challenge target based on current marks.
- Aggregate period/all-time stats and recent activity.

```mermaid
flowchart TD
A["Filter attempts (practice mode)"] --> B["Group by userId"]
B --> C["Sum marks, correct, count attempts"]
C --> D["Sort by marks(desc), correct(desc), attempts(asc)"]
D --> E["Map to entries with accuracy"]
E --> F["Compute weekly challenge target"]
F --> G["Aggregate period/all-time totals"]
G --> H["Fetch recent activity"]
H --> I["Return leaderboard response"]
```

**Diagram sources**
- [LeaderboardService.java:203-224](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L203-L224)
- [LeaderboardService.java:79-83](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L79-L83)
- [LeaderboardService.java:85-115](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L85-L115)
- [LeaderboardService.java:117-148](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L117-L148)

### Dashboard Components and Metrics
- Performance trends: Accuracy and questions solved over the last 28 days.
- Subject performance: Four-subject gauges rolled up from chapter-level data.
- Weak areas: Table of weakest chapters with action links.
- Mistakes overview: Donut chart of mistake categories.
- Insights: AI-driven recommendations and potential improvement calculations.

**Section sources**
- [AnalyticsDashboard.tsx:261-415](file://frontend/src/components/AnalyticsDashboard.tsx#L261-L415)
- [analyticsDashboard.ts:56-107](file://frontend/src/utils/analyticsDashboard.ts#L56-L107)
- [analyticsDashboard.ts:110-144](file://frontend/src/utils/analyticsDashboard.ts#L110-L144)
- [analyticsDashboard.ts:172-199](file://frontend/src/utils/analyticsDashboard.ts#L172-L199)
- [analyticsInsights.ts:19-47](file://frontend/src/utils/analyticsInsights.ts#L19-L47)

### Example Queries and Reports
- Recent events summary: Top events, unique sessions, and daily page views for a configurable window.
- Leaderboard: Entries, stats, recent activity, and total players for a given period.

**Section sources**
- [ProductAnalyticsService.java:71-103](file://backend/src/main/java/com/neetlu/examhunt/service/ProductAnalyticsService.java#L71-L103)
- [LeaderboardService.java:40-77](file://backend/src/main/java/com/neetlu/examhunt/service/LeaderboardService.java#L40-L77)

### Integration Notes
- Frontend uses typed API responses and utility modules to render dashboards and leaderboards.
- Backend configuration controls analytics ingestion globally.

**Section sources**
- [api.ts:1-200](file://frontend/src/api.ts#L1-L200)
- [AnalyticsProperties.java:1-7](file://backend/src/main/java/com/neetlu/examhunt/config/AnalyticsProperties.java#L1-L7)