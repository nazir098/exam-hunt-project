package com.neetlu.examhunt.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class ImportJobService {

    private static final int MAX_RETAINED_JOBS = 30;

    private final ManifestImportService importService;
    private final ExecutorService executor;
    private final ConcurrentHashMap<String, ImportJob> jobs = new ConcurrentHashMap<>();
    private final Deque<String> jobOrder = new ArrayDeque<>();

    public ImportJobService(ManifestImportService importService) {
        this.importService = importService;
        this.executor = Executors.newSingleThreadExecutor(r -> {
            Thread thread = new Thread(r, "manifest-import");
            thread.setDaemon(true);
            return thread;
        });
    }

    public ImportJobView startFolderImport(String folderName) {
        String normalized = folderName == null ? "" : folderName.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name is required");
        }
        return enqueue(ImportJobType.FOLDER, normalized, () -> importService.importFromFolder(normalized));
    }

    public ImportJobView startNeetImport() {
        return enqueue(ImportJobType.NEET, null, importService::importNeetFolders);
    }

    public ImportJobView startAllImport() {
        return enqueue(ImportJobType.ALL, null, importService::importAllPublishedFolders);
    }

    public ImportJobView getJob(String jobId) {
        ImportJob job = jobs.get(jobId);
        if (job == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Import job not found");
        }
        return job.toView();
    }

    public List<ImportJobView> listRecentJobs() {
        synchronized (jobOrder) {
            List<ImportJobView> out = new ArrayList<>();
            for (String id : jobOrder) {
                ImportJob job = jobs.get(id);
                if (job != null) {
                    out.add(job.toView());
                }
            }
            return out;
        }
    }

    private ImportJobView enqueue(ImportJobType type, String folderName, ImportTask task) {
        ImportJob job = new ImportJob(UUID.randomUUID().toString(), type, folderName);
        jobs.put(job.id(), job);
        synchronized (jobOrder) {
            jobOrder.addFirst(job.id());
            while (jobOrder.size() > MAX_RETAINED_JOBS) {
                String oldest = jobOrder.removeLast();
                jobs.remove(oldest);
            }
        }
        executor.submit(() -> runJob(job, task));
        return job.toView();
    }

    private void runJob(ImportJob job, ImportTask task) {
        job.markRunning();
        try {
            ManifestImportService.ImportResult result = task.run();
            job.markSucceeded(result, buildSuccessMessage(job.type(), result, job.folderName()));
        } catch (Exception ex) {
            String error = ex.getMessage() == null || ex.getMessage().isBlank()
                    ? ex.getClass().getSimpleName()
                    : ex.getMessage();
            job.markFailed(error);
        }
    }

    private static String buildSuccessMessage(
            ImportJobType type, ManifestImportService.ImportResult result, String folderName) {
        return switch (type) {
            case FOLDER -> "Imported " + result.questionsImported() + " PYQs + " + result.variantsImported()
                    + " AI variants from " + folderName;
            case NEET -> "Imported " + result.questionsImported() + " PYQs + " + result.variantsImported()
                    + " AI variants across " + result.packsProcessed() + " NEET pack(s)";
            case ALL -> "Imported " + result.questionsImported() + " PYQs + " + result.variantsImported()
                    + " AI variants across " + result.packsProcessed() + " pack(s)";
        };
    }

    @FunctionalInterface
    private interface ImportTask {
        ManifestImportService.ImportResult run() throws IOException;
    }

    enum ImportJobType {
        FOLDER,
        NEET,
        ALL
    }

    enum ImportJobStatus {
        QUEUED,
        RUNNING,
        SUCCEEDED,
        FAILED
    }

    static final class ImportJob {
        private final String id;
        private final ImportJobType type;
        private final String folderName;
        private final Instant createdAt;
        private volatile ImportJobStatus status = ImportJobStatus.QUEUED;
        private volatile Instant startedAt;
        private volatile Instant completedAt;
        private volatile String message;
        private volatile String error;
        private volatile String packId;
        private volatile Integer questionsImported;
        private volatile Integer variantsImported;
        private volatile Integer packsProcessed;
        private volatile List<String> packIds;
        private volatile List<ImportJobDetail> details;

        ImportJob(String id, ImportJobType type, String folderName) {
            this.id = id;
            this.type = type;
            this.folderName = folderName;
            this.createdAt = Instant.now();
        }

        String id() {
            return id;
        }

        ImportJobType type() {
            return type;
        }

        String folderName() {
            return folderName;
        }

        void markRunning() {
            status = ImportJobStatus.RUNNING;
            startedAt = Instant.now();
            message = "Import in progress…";
        }

        void markSucceeded(ManifestImportService.ImportResult result, String successMessage) {
            status = ImportJobStatus.SUCCEEDED;
            completedAt = Instant.now();
            message = successMessage;
            packId = result.packId();
            questionsImported = result.questionsImported();
            variantsImported = result.variantsImported();
            packsProcessed = result.packsProcessed();
            if (result.details() != null && !result.details().isEmpty()) {
                packIds = result.details().stream()
                        .map(ManifestImportService.ImportResult::packId)
                        .toList();
                details = result.details().stream()
                        .map(d -> new ImportJobDetail(
                                d.packId(),
                                d.questionsImported(),
                                d.variantsImported()))
                        .toList();
            }
        }

        void markFailed(String failureMessage) {
            status = ImportJobStatus.FAILED;
            completedAt = Instant.now();
            error = failureMessage;
            message = failureMessage;
        }

        ImportJobView toView() {
            return new ImportJobView(
                    id,
                    type.name().toLowerCase(),
                    folderName,
                    status.name(),
                    message,
                    error,
                    createdAt,
                    startedAt,
                    completedAt,
                    packId,
                    questionsImported,
                    variantsImported,
                    packsProcessed,
                    packIds,
                    details);
        }
    }

    public record ImportJobDetail(String packId, int questionsImported, int variantsImported) {}

    public record ImportJobView(
            String jobId,
            String type,
            String folderName,
            String status,
            String message,
            String error,
            Instant createdAt,
            Instant startedAt,
            Instant completedAt,
            String packId,
            Integer questionsImported,
            Integer variantsImported,
            Integer packsProcessed,
            List<String> packIds,
            List<ImportJobDetail> details) {}
}
