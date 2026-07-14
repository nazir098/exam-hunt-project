#!/usr/bin/env python3
"""Apply pdf-qa-extractor metadata edits (used by exam-hunt admin)."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _bootstrap_extractor_src(output_root: Path | None = None) -> None:
    src = os.environ.get("EXTRACTOR_SOURCE_ROOT", "").strip()
    if not src and output_root is not None:
        candidate = output_root.parent / "src"
        if candidate.is_dir():
            src = str(candidate)
    if not src:
        return
    path = Path(src).resolve()
    if path.is_dir() and str(path) not in sys.path:
        sys.path.insert(0, str(path))


def _metadata_path(output_root: Path, folder: str, question_id: str) -> Path:
    return output_root / folder / "metadata" / f"{question_id}.json"


def _raw_text_field_key(meta: dict[str, Any], target: str) -> str:
    if target == "solution":
        source = str(meta.get("solution_format_source") or "").strip().lower()
        if source == "llm":
            return "solution_text_llm"
        if source == "parser":
            return "solution_text_parsed"
        if source == "mineru":
            return "solution_text_mineru"
        return "solution_text"
    source = str(meta.get("content_format_source") or "").strip().lower()
    mineru = str(meta.get("question_text_mineru") or "").strip()
    if source == "mineru":
        return "question_text_mineru"
    if source in ("llm", "parser"):
        return "question_text_mineru" if mineru else "question_text"
    return "question_text_mineru" if mineru else "question_text"


def apply_raw_text_edit(meta: dict[str, Any], target: str, text: str) -> dict[str, Any]:
    from content_format.latex_normalize import normalize_mineru_text
    from content_format.mineru_extract import ensure_metadata_inline_asset_markers

    key = _raw_text_field_key(meta, target)
    cleaned = normalize_mineru_text(str(text or ""), preserve_layout=True)
    meta[key] = cleaned.strip()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if target == "solution":
        meta["solution_raw_edited_at"] = stamp
    else:
        meta["question_raw_edited_at"] = stamp
    return ensure_metadata_inline_asset_markers(meta)


def _refresh_and_save(
    meta: dict[str, Any],
    path: Path,
    pack_dir: Path,
    *,
    target: str,
    preserve_approval: bool = False,
) -> dict[str, Any]:
    was_approved = bool(meta.get("content_render_approved"))
    if target == "question":
        from content_format.pipeline import refresh_question_structured_from_raw

        field = _raw_text_field_key(meta, "question")
        meta = refresh_question_structured_from_raw(meta, raw_field=field, pack_dir=pack_dir)
        if preserve_approval and was_approved:
            meta["content_render_approved"] = True
        else:
            meta["content_render_approved"] = False
    path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def save_and_refresh(
    output_root: Path,
    folder: str,
    question_id: str,
    *,
    target: str,
    text: str,
) -> dict[str, Any]:
    path = _metadata_path(output_root, folder, question_id)
    if not path.is_file():
        raise FileNotFoundError(f"Metadata not found: {path}")
    meta = json.loads(path.read_text(encoding="utf-8"))
    meta = apply_raw_text_edit(meta, target, text)
    pack_dir = output_root / folder
    return _refresh_and_save(meta, path, pack_dir, target=target)


def _parse_bbox(raw: str) -> list[float]:
    data = json.loads(raw)
    if not isinstance(data, list) or len(data) != 4:
        raise ValueError("source_bbox_json must be [x0, y0, x1, y1] in 0–1000 space")
    return [float(v) for v in data]


def _collect_question_files(pack_dir: Path, meta: dict[str, Any]) -> list[Path]:
    files: list[Path] = []
    seen: set[str] = set()

    def add(rel: str) -> None:
        rel = str(rel or "").strip()
        if not rel or rel in seen:
            return
        path = pack_dir / rel
        if path.is_file():
            seen.add(rel)
            files.append(path)

    add(str(meta.get("question_image") or ""))
    add(str(meta.get("solution_image") or ""))
    for key in ("mineru_diagrams", "diagram_assets", "solution_mineru_diagrams"):
        for rel in meta.get(key) or []:
            add(str(rel))
    for key in ("question_asset_placements", "solution_asset_placements", "asset_placements"):
        for row in meta.get(key) or []:
            if isinstance(row, dict):
                add(str(row.get("path") or ""))
    return files


def _public_url(base: str, folder: str, rel: str, version: int | None = None) -> str:
    rel = rel.lstrip("/")
    if rel.startswith(folder + "/"):
        key = rel
    else:
        key = f"{folder}/{rel}"
    url = f"{base.rstrip('/')}/{key}"
    if version and version > 0:
        url = f"{url}?v={version}"
    return url


def _stamp_cdn_urls(meta: dict[str, Any], folder: str, public_base: str, pack_dir: Path) -> dict[str, Any]:
    """Point metadata image URLs at the public CDN with mtime cache-bust."""
    if not public_base:
        return meta

    def version_for(rel: str) -> int:
        path = pack_dir / rel
        try:
            return int(path.stat().st_mtime * 1000) if path.is_file() else 0
        except OSError:
            return 0

    q_rel = str(meta.get("question_image") or "").strip()
    if q_rel:
        meta["question_image_url"] = _public_url(public_base, folder, q_rel, version_for(q_rel))
    s_rel = str(meta.get("solution_image") or "").strip()
    if s_rel:
        meta["solution_image_url"] = _public_url(public_base, folder, s_rel, version_for(s_rel))

    diagram_urls: list[str] = []
    for rel in meta.get("mineru_diagrams") or []:
        rel_s = str(rel).strip()
        if rel_s:
            diagram_urls.append(_public_url(public_base, folder, rel_s, version_for(rel_s)))
    if diagram_urls:
        meta["mineru_diagram_urls"] = diagram_urls

    for key in ("question_asset_placements", "solution_asset_placements", "asset_placements"):
        rows = meta.get(key)
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            rel = str(row.get("path") or "").strip()
            if rel:
                row["url"] = _public_url(public_base, folder, rel, version_for(rel))
    return meta


def publish_question_to_r2(
    output_root: Path,
    folder: str,
    question_id: str,
) -> dict[str, Any]:
    """
    Force-upload this question's images + metadata JSON to R2 so production CDN matches local crops.
    Bypasses qc_status gates used by bulk sync — admin crop/publish is intentional.
    """
    from storage.r2 import R2Config, R2Uploader
    from utils.config import load_settings

    settings = load_settings()
    env = settings.get("env") or {}
    if not env.get("r2_upload_enabled") and not os.getenv("EXAM_HUNT_FORCE_R2_PUBLISH", "").strip():
        # Still publish when credentials exist — admin crop implies intent to ship.
        pass
    r2 = R2Config.from_env(env)
    if not r2.is_configured():
        return {
            "ok": False,
            "skipped": True,
            "reason": "r2_not_configured",
            "detail": "Set R2_* in pdf-qa-extractor/.env to publish crops to production CDN.",
        }

    pack_dir = output_root / folder
    path = _metadata_path(output_root, folder, question_id)
    if not path.is_file():
        return {"ok": False, "error": f"Metadata not found: {path}"}
    meta = json.loads(path.read_text(encoding="utf-8"))
    meta = _stamp_cdn_urls(meta, folder, r2.public_base_url, pack_dir)
    path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    files = _collect_question_files(pack_dir, meta)
    storage_cfg = settings.get("storage", {})
    uploader = R2Uploader(r2, retry_attempts=int(storage_cfg.get("retry_attempts", 3)))
    upload_items: list[tuple[Path, str]] = []
    for local in files:
        rel = str(local.relative_to(pack_dir)).replace("\\", "/")
        upload_items.append((local, f"{folder}/{rel}"))
    upload_items.append((path, f"{folder}/metadata/{question_id}.json"))

    results = uploader.bulk_upload(
        upload_items,
        concurrency=int(storage_cfg.get("upload_concurrency", 4)),
    )
    ok = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    detail = f"Uploaded {len(ok)} file(s) to R2."
    if failed:
        detail = f"Uploaded {len(ok)}; {len(failed)} failed: {failed[0].error}"
    return {
        "ok": len(failed) == 0 and len(ok) > 0,
        "uploaded_files": len(ok),
        "failed_files": len(failed),
        "detail": detail,
        "errors": [r.error for r in failed[:3]],
    }


def _attach_r2_result(meta: dict[str, Any], r2_result: dict[str, Any]) -> dict[str, Any]:
    meta["_exam_hunt_r2"] = r2_result
    if r2_result.get("ok"):
        base = str(meta.get("_exam_hunt_message") or "").rstrip(".")
        meta["_exam_hunt_message"] = f"{base}. Published to R2 for production."
    elif r2_result.get("skipped"):
        base = str(meta.get("_exam_hunt_message") or "").rstrip(".")
        meta["_exam_hunt_message"] = (
            f"{base}. Local only — {r2_result.get('detail') or r2_result.get('reason')}"
        )
    elif r2_result.get("error") or r2_result.get("failed_files"):
        base = str(meta.get("_exam_hunt_message") or "").rstrip(".")
        meta["_exam_hunt_message"] = (
            f"{base}. R2 publish failed: {r2_result.get('detail') or r2_result.get('error')}"
        )
    return meta


def add_asset_from_source(
    output_root: Path,
    folder: str,
    question_id: str,
    *,
    target: str,
    source_bbox: list[float],
    insert_marker: bool = True,
    publish_r2: bool = True,
) -> dict[str, Any]:
    from content_format.asset_manage import add_content_asset

    path = _metadata_path(output_root, folder, question_id)
    if not path.is_file():
        raise FileNotFoundError(f"Metadata not found: {path}")
    meta = json.loads(path.read_text(encoding="utf-8"))
    pack_dir = output_root / folder
    meta, index = add_content_asset(
        meta,
        pack_dir,
        target=target,
        source_bbox_norm1000=source_bbox,
        insert_marker=insert_marker,
    )
    meta = _refresh_and_save(meta, path, pack_dir, target=target, preserve_approval=True)
    meta["_exam_hunt_asset_index"] = index
    meta["_exam_hunt_message"] = f"Added figure {{{{asset:{index}}}}} from source crop."
    if publish_r2:
        r2_result = publish_question_to_r2(output_root, folder, question_id)
        meta = json.loads(path.read_text(encoding="utf-8"))
        meta["_exam_hunt_asset_index"] = index
        meta["_exam_hunt_message"] = f"Added figure {{{{asset:{index}}}}} from source crop."
        meta = _attach_r2_result(meta, r2_result)
    return meta


def crop_asset_from_source(
    output_root: Path,
    folder: str,
    question_id: str,
    *,
    target: str,
    index: int,
    source_bbox: list[float],
    publish_r2: bool = True,
) -> dict[str, Any]:
    from content_format.asset_manage import recrop_content_asset_from_source

    path = _metadata_path(output_root, folder, question_id)
    if not path.is_file():
        raise FileNotFoundError(f"Metadata not found: {path}")
    meta = json.loads(path.read_text(encoding="utf-8"))
    pack_dir = output_root / folder
    meta = recrop_content_asset_from_source(
        meta,
        pack_dir,
        target=target,
        index=index,
        source_bbox_norm1000=source_bbox,
    )
    meta = _refresh_and_save(meta, path, pack_dir, target=target, preserve_approval=True)
    meta["_exam_hunt_asset_index"] = index
    meta["_exam_hunt_message"] = f"Re-cropped figure {{{{asset:{index}}}}} from source."
    if publish_r2:
        r2_result = publish_question_to_r2(output_root, folder, question_id)
        meta = json.loads(path.read_text(encoding="utf-8"))
        meta["_exam_hunt_asset_index"] = index
        meta["_exam_hunt_message"] = f"Re-cropped figure {{{{asset:{index}}}}} from source."
        meta = _attach_r2_result(meta, r2_result)
    return meta


def main() -> int:
    parser = argparse.ArgumentParser(description="Exam-hunt extractor metadata bridge")
    parser.add_argument("--output-root", required=True, help="pdf-qa-extractor output root")
    parser.add_argument("--folder", required=True)
    parser.add_argument("--question-id", required=True)
    parser.add_argument("--target", choices=("question", "solution"), default="question")
    parser.add_argument(
        "--action",
        choices=("raw-text", "add-asset", "crop-asset"),
        default="raw-text",
    )
    parser.add_argument("--text-file", help="UTF-8 file with raw text body (raw-text)")
    parser.add_argument(
        "--source-bbox-json",
        help='Norm-1000 crop box as JSON "[x0,y0,x1,y1]" (add-asset / crop-asset)',
    )
    parser.add_argument("--index", type=int, default=-1, help="Asset index (crop-asset)")
    parser.add_argument(
        "--insert-marker",
        choices=("true", "false"),
        default="true",
        help="Insert {{asset:N}} into raw text when adding (add-asset)",
    )
    parser.add_argument(
        "--publish-r2",
        choices=("true", "false"),
        default="true",
        help="Upload cropped assets + metadata to R2 (default true)",
    )
    args = parser.parse_args()

    output_root = Path(args.output_root)
    _bootstrap_extractor_src(output_root)
    publish_r2 = args.publish_r2 == "true"

    if args.action == "raw-text":
        if not args.text_file:
            raise SystemExit("--text-file is required for raw-text")
        text = Path(args.text_file).read_text(encoding="utf-8")
        meta = save_and_refresh(
            output_root,
            args.folder,
            args.question_id,
            target=args.target,
            text=text,
        )
    elif args.action == "add-asset":
        if not args.source_bbox_json:
            raise SystemExit("--source-bbox-json is required for add-asset")
        meta = add_asset_from_source(
            output_root,
            args.folder,
            args.question_id,
            target=args.target,
            source_bbox=_parse_bbox(args.source_bbox_json),
            insert_marker=args.insert_marker == "true",
            publish_r2=publish_r2,
        )
    else:
        if not args.source_bbox_json:
            raise SystemExit("--source-bbox-json is required for crop-asset")
        if args.index < 0:
            raise SystemExit("--index is required for crop-asset")
        meta = crop_asset_from_source(
            output_root,
            args.folder,
            args.question_id,
            target=args.target,
            index=args.index,
            source_bbox=_parse_bbox(args.source_bbox_json),
            publish_r2=publish_r2,
        )

    print(json.dumps(meta, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
