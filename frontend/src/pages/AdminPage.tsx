import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  adminCleanupDemoPacks,
  adminCleanupLeaderboardDemo,
  adminDeletePack,
  adminImportAll,
  adminImportFolder,
  adminImportNeet,
  adminSeedLeaderboardDemo,
  fetchAdminImportFolders,
  fetchAdminPacks,
  type AdminActionResult,
  type AdminPackRow,
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
  const [installedPacks, setInstalledPacks] = useState<AdminPackRow[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInstalledPacks = useCallback(() => {
    setPacksLoading(true);
    fetchAdminPacks()
      .then((res) => {
        const seen = new Set<string>();
        const unique = res.packs.filter((p) => {
          if (seen.has(p.packId)) return false;
          seen.add(p.packId);
          return true;
        });
        setInstalledPacks(unique);
      })
      .catch(() => setInstalledPacks([]))
      .finally(() => setPacksLoading(false));
  }, []);

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

  useEffect(() => {
    if (!user?.admin) return;
    loadInstalledPacks();
  }, [user?.admin, loadInstalledPacks]);

  const runTask = useCallback(async (task: AdminTask) => {
    setBusyId(task.id);
    setError(null);
    setLog(null);
    try {
      const result = await task.run();
      setLog(formatResult(result));
      if (task.id.startsWith("import-") || task.id === "cleanup-demo") {
        loadInstalledPacks();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }, [loadInstalledPacks]);

  const deletePack = useCallback(
    async (packId: string) => {
      const taskId = `delete-pack-${packId}`;
      setBusyId(taskId);
      setError(null);
      setLog(null);
      try {
        const result = await adminDeletePack(packId);
        setLog(formatResult(result));
        loadInstalledPacks();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [loadInstalledPacks]
  );

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
      description: folders.length
        ? "Import every locally discovered NEET manifest folder."
        : "Bulk sync needs local extractor folders on the server. Use single-folder sync below for remote import.",
      run: adminImportNeet,
    },
    {
      id: "import-all",
      title: "Sync all published packs",
      description: folders.length
        ? "Import all locally discovered manifest folders (not only NEET)."
        : "Bulk sync needs local extractor folders on the server. Use single-folder sync below for remote import.",
      run: adminImportAll,
    },
    {
      id: "import-folder",
      title: `Sync folder “${folderName.trim() || "…"}”`,
      description: "Import one published folder by name, using remote manifest fallback when local files are unavailable.",
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
        <h2 className="admin-page__section-title">Question editor</h2>
        <p className="admin-page__section-desc muted">
          Preview how students see question text, options, and LaTeX. Fix content and override AI
          assistant responses saved for future hits.
        </p>
        <Link to="/admin/questions" className="btn primary">
          Open question editor
        </Link>
      </section>

      <section className="admin-page__section">
        <h2 className="admin-page__section-title">Import / sync</h2>
        <div className="admin-page__folder">
          <label className="text-body-sm text-on-surface-variant" htmlFor="admin-folder">
            Published folder
          </label>
          {folders.length > 0 ? (
            <select
              id="admin-folder"
              className="admin-page__input admin-page__select"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={foldersLoading}
            >
              {foldersLoading && <option value="">Loading folders…</option>}
              {folders.map((f) => (
                <option key={f.folderName} value={f.folderName}>
                  {f.folderName} — {f.exam} {f.year} ({f.questionCount} questions)
                </option>
              ))}
            </select>
          ) : (
            <input
              id="admin-folder"
              className="admin-page__input"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="2016"
              disabled={foldersLoading}
            />
          )}
          {foldersError && <p className="admin-page__folder-hint admin-page__folder-hint--error">{foldersError}</p>}
          {!foldersLoading && !foldersError && folders.length > 0 && (
            <p className="admin-page__folder-hint muted">
              Local extractor discovery found {folders.length} published manifest
              {folders.length === 1 ? "" : "s"}
            </p>
          )}
          {!foldersLoading && !foldersError && folders.length === 0 && (
            <p className="admin-page__folder-hint muted">
              No local extractor folders are mounted on this server. Enter a folder name, such as 2016,
              to import from the configured remote manifest source.
            </p>
          )}
        </div>
        <div className={"admin-page__grid" + (busyId ? " admin-page__grid--busy" : "")}>
          {importTasks.map((task) => {
            const running = busyId === task.id;
            const blocked = busyId !== null && !running;
            return (
              <article key={task.id} className="admin-card">
                <h3 className="admin-card__title">{task.title}</h3>
                <p className="admin-card__desc">{task.description}</p>
                <button
                  type="button"
                  className={"btn primary btn-block" + (running ? " admin-btn--busy" : "")}
                  disabled={
                    blocked ||
                    running ||
                    (task.id === "import-folder" && !folderName.trim()) ||
                    ((task.id === "import-neet" || task.id === "import-all") && folders.length === 0)
                  }
                  onClick={() => runTask(task)}
                >
                  {running ? "Running…" : "Run"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-page__section">
        <h2 className="admin-page__section-title">Installed packs</h2>
        <p className="admin-page__section-desc muted">
          Packs currently in the database — these appear in Question Bank and Practice. Remove extras
          you did not import.
        </p>
        {packsLoading ? (
          <p className="muted">Loading packs…</p>
        ) : installedPacks.length === 0 ? (
          <p className="muted">No packs imported yet. Sync folder 2016 above.</p>
        ) : (
          <ul className="admin-pack-list">
            {installedPacks.map((p) => {
              const deleteId = `delete-pack-${p.packId}`;
              const running = busyId === deleteId;
              const blocked = busyId !== null && !running;
              return (
                <li key={p.packId} className="admin-pack-row">
                  <div>
                    <strong>
                      <Link to={`/admin/questions?packId=${encodeURIComponent(p.packId)}&q=Q`}>
                        {p.packId}
                      </Link>
                    </strong>
                    <span className="admin-pack-row__meta muted">
                      {p.exam} {p.year}
                      {p.sourceFolder ? ` · folder ${p.sourceFolder}` : ""}
                      {" · "}
                      {p.questionCount} questions
                      {p.demo ? " · demo" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={"btn danger" + (running ? " admin-btn--busy" : "")}
                    disabled={blocked || running}
                    onClick={() => deletePack(p.packId)}
                  >
                    {running ? "Removing…" : "Remove"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-page__section">
        <h2 className="admin-page__section-title">Cleanup &amp; demo data</h2>
        <div className={"admin-page__grid" + (busyId ? " admin-page__grid--busy" : "")}>
          {maintenanceTasks.map((task) => {
            const running = busyId === task.id;
            const blocked = busyId !== null && !running;
            return (
              <article
                key={task.id}
                className={"admin-card" + (task.variant === "danger" ? " admin-card--danger" : "")}
              >
                <h3 className="admin-card__title">{task.title}</h3>
                <p className="admin-card__desc">{task.description}</p>
                <button
                  type="button"
                  className={
                    (task.variant === "danger" ? "btn danger btn-block" : "btn btn-block") +
                    (running ? " admin-btn--busy" : "")
                  }
                  disabled={blocked || running}
                  onClick={() => runTask(task)}
                >
                  {running ? "Running…" : "Run"}
                </button>
              </article>
            );
          })}
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
