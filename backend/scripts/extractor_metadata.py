#!/usr/bin/env python3
"""Apply pdf-qa-extractor raw-text edits and re-parse structured fields (used by exam-hunt admin)."""

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
    if target == "question":
        from content_format.pipeline import refresh_question_structured_from_raw

        field = _raw_text_field_key(meta, "question")
        meta = refresh_question_structured_from_raw(meta, raw_field=field, pack_dir=pack_dir)
        meta["content_render_approved"] = False
    path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


def main() -> int:
    parser = argparse.ArgumentParser(description="Exam-hunt extractor metadata bridge")
    parser.add_argument("--output-root", required=True, help="pdf-qa-extractor output root")
    parser.add_argument("--folder", required=True)
    parser.add_argument("--question-id", required=True)
    parser.add_argument("--target", choices=("question", "solution"), default="question")
    parser.add_argument("--text-file", required=True, help="UTF-8 file with raw text body")
    args = parser.parse_args()

    output_root = Path(args.output_root)
    _bootstrap_extractor_src(output_root)
    text = Path(args.text_file).read_text(encoding="utf-8")
    meta = save_and_refresh(
        output_root,
        args.folder,
        args.question_id,
        target=args.target,
        text=text,
    )
    print(json.dumps(meta, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
