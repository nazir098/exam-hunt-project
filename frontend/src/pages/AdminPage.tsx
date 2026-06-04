import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  adminCleanupDemoPacks,
  adminCleanupLeaderboardDemo,
  adminImportAll,
  adminImportFolder,
  adminImportNeet,
  adminSeedLeaderboardDemo,
  fetchAdminImportFolders,
  type AdminActionResult,
  type ImportFolderOption,
} from "../api";
import AdminPlatformSettingsPanel from "../components/AdminPlatformSettings";
import { useAuth } from "../auth/AuthContext";

type AdminTask = {
  id: string;
  title: string;
  description: string;
  run: () => Promise<AdminActionResult>;
  variant?: "danger";
};

function formatResult(data: AdminActionResult): string {
  if (data.message && typeof data.message === "string") {
    return data.message;
  }
  return JSON.stringify(data, null, 2);
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [folders, setFolders] = useState<ImportFolderOption[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.admin) return;
    setFoldersLoading(true);
    setFoldersError(null);
    fetchAdminImportFolders()
      .then((res) => {
        setFolders(res.folders);
        if (res.folders.length) {
          setFolderName((prev) =>
            prev && res.folders.some((f) => f.folderName === prev) ? prev : res.folders[0].folderName
          );
        }
      })
      .catch((e) => setFoldersError(e instanceof Error ? e.message : "Could not load folders"))
      .finally(() => setFoldersLoading(false));
  }, [user?.admin]);

  const runTask = useCallback(async (task: AdminTask) => {
    setBusyId(task.id);
    setError(null);
    setLog(null);
    try {
      const result = await task.run();
      setLog(formatResult(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }, []);

  if (loading) {
    return (
      <main className="stitch-page admin-page">
        <p className="text-body text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (!user?.admin) {
    return <Navigate to="/login" replace />;
  }

  const importTasks: AdminTask[] = [
    {
      id: "import-neet",
      title: "Sync all NEET packs",
      description: "Import every published NEET folder from EXTRACTOR_ROOT.",
      run: adminImportNeet,
    },
    {
      id: "import-all",
      title: "Sync all published packs",
      description: "Import all published manifest folders (not only NEET).",
      run: adminImportAll,
    },
    {
      id: "import-folder",
      title: `Sync folder “${folderName.trim() || "…"}”`,
      description: "Import one extractor output folder by name (e.g. 2016).",
      run: () => adminImportFolder(folderName.trim()),
    },
  ];

  const maintenanceTasks: AdminTask[] = [
    {
      id: "cleanup-demo",
      title: "Remove demo packs",
      description: "Delete legacy DEMO_* placeholder packs from the database.",
      run: adminCleanupDemoPacks,
      variant: "danger",
    },
    {
      id: "seed-lb",
      title: "Seed leaderboard demo",
      description: "Create demo users and attempts for the leaderboard UI.",
      run: () => adminSeedLeaderboardDemo(false),
    },
    {
      id: "seed-lb-force",
      title: "Re-seed leaderboard demo",
      description: "Force refresh demo leaderboard data.",
      run: () => adminSeedLeaderboardDemo(true),
    },
    {
      id: "cleanup-lb",
      title: "Remove leaderboard demo",
      description: "Delete lb-demo-* users and their attempts.",
      run: adminCleanupLeaderboardDemo,
      variant: "danger",
    },
  ];

  return (
    <main className="stitch-page admin-page">
      <header className="admin-page__hero">
        <div>
          <p className="text-caption text-on-surface-variant uppercase tracking-wide">Administrator</p>
          <h1 className="text-headline text-on-surface">Data &amp; maintenance</h1>
          <p className="text-body-sm text-on-surface-variant mt-2 max-w-xl">
            Signed in as <strong>{user.email}</strong>. These actions update MongoDB — run imports after
            publishing new extractor output.
          </p>
        </div>
        <Link to="/" className="btn">
          Back to dashboard
        </Link>
      </header>

      <AdminPlatformSettingsPanel />

      <section className="admin-page__section">
        <h2 className="admin-page__section-title">Import / sync</h2>
        <div className="admin-page__folder">
          <label className="text-body-sm text-on-surface-variant" htmlFor="admin-folder">
            Extractor folder
          </label>
          <select
            id="admin-folder"
            className="admin-page__input admin-page__select"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            disabled={foldersLoading || folders.length === 0}
          >
            {foldersLoading && <option value="">Loading folders…</option>}
            {!foldersLoading && folders.length === 0 && (
              <option value="">No published folders found</option>
            )}
            {folders.map((f) => (
              <option key={f.folderName} value={f.folderName}>
                {f.folderName} — {f.exam} {f.year} ({f.questionCount} questions)
              </option>
            ))}
          </select>
          {foldersError && <p className="admin-page__folder-hint admin-page__folder-hint--error">{foldersError}</p>}
          {!foldersLoading && !foldersError && folders.length > 0 && (
            <p className="admin-page__folder-hint muted">
              From EXTRACTOR_ROOT/output · {folders.length} published manifest
              {folders.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="admin-page__grid">
          {importTasks.map((task) => (
            <article key={task.id} className="admin-card">
              <h3 className="admin-card__title">{task.title}</h3>
              <p className="admin-card__desc">{task.description}</p>
              <button
                type="button"
                className="btn primary btn-block"
                disabled={busyId !== null || (task.id === "import-folder" && !folderName.trim())}
                onClick={() => runTask(task)}
              >
                {busyId === task.id ? "Running…" : "Run"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-page__section">
        <h2 className="admin-page__section-title">Cleanup &amp; demo data</h2>
        <div className="admin-page__grid">
          {maintenanceTasks.map((task) => (
            <article
              key={task.id}
              className={"admin-card" + (task.variant === "danger" ? " admin-card--danger" : "")}
            >
              <h3 className="admin-card__title">{task.title}</h3>
              <p className="admin-card__desc">{task.description}</p>
              <button
                type="button"
                className={
                  task.variant === "danger" ? "btn danger btn-block" : "btn btn-block"
                }
                disabled={busyId !== null}
                onClick={() => runTask(task)}
              >
                {busyId === task.id ? "Running…" : "Run"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {(log || error) && (
        <section className="admin-page__log" aria-live="polite">
          <h2 className="admin-page__section-title">Last result</h2>
          {error ? (
            <pre className="admin-page__log-pre admin-page__log-pre--error">{error}</pre>
          ) : (
            <pre className="admin-page__log-pre">{log}</pre>
          )}
        </section>
      )}
    </main>
  );
}
