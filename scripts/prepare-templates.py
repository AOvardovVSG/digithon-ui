#!/usr/bin/env python3
"""
Offline template preparation for the provider-proposal feature.

For each insurer's source questionnaire PDF this script produces, under
`public/templates/property/<id>/`:

  - template.pdf  : the SAME questionnaire, normalized (object streams disabled so
                    pdf-lib can load it) and BLANKED (all sample form values + their
                    appearance streams removed) so we can stamp answers on a clean form.
  - fields.json   : every form-field WIDGET as { name, type, page, rect, onState, ... },
                    with page dimensions. `rect` is in PDF user space (origin bottom-left)
                    — exactly what pdf-lib's drawText() consumes at fill time.

It also renders a PNG preview of each blanked page to `.tmp/previews/<id>/` (git-ignored)
so the per-provider adapters can be authored/verified against the real layout.

These provider PDFs use modern object/xref-stream compression that pypdf and pdf-lib's
form parser choke on, but pikepdf (qpdf) reads them cleanly — hence this Python step runs
once, offline, and commits its output. Nothing here ships to the runtime/Node side.

Usage:  python3 scripts/prepare-templates.py [provider_id ...]
        (no args = all providers)
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pikepdf
from pikepdf import Name

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = Path.home() / "Downloads"
OUT_ROOT = ROOT / "public" / "templates" / "property"
PREVIEW_ROOT = ROOT / ".tmp" / "previews"

# provider id -> source PDF (the 8 distinct property/industrial-fire questionnaires).
# be3436ed… is a byte-identical duplicate of aliance (Allianz) and is intentionally omitted.
SOURCES: dict[str, str] = {
    "allianz": "aliance.pdf",
    "armeec": "armeec.pdf",
    "axiom": "axiom.pdf",
    "bulgaria-insurance": "bulgaria_insurance.pdf",
    "bulstrad": "bulstrad.pdf",
    "groupama": "groupama.pdf",
    "ozk": "9327f6d8-7718-4762-8add-7c7546930da0.pdf",
    "uniqa": "uniqa.pdf",
}

FIELD_ATTRS = ("/T", "/FT", "/Parent", "/Kids", "/V", "/AS", "/AP", "/Rect", "/Subtype")


def inherited(obj, key: str):
    """Resolve a field attribute that may be inherited from a /Parent (e.g. /FT)."""
    node = obj
    seen = 0
    while node is not None and seen < 50:
        if key in node:
            return node[key]
        node = node.get("/Parent")
        seen += 1
    return None


def full_name(widget) -> str:
    """Fully-qualified field name: parent /T chain joined with '.', plus the widget's own /T."""
    parts: list[str] = []
    node = widget
    seen = 0
    while node is not None and seen < 50:
        t = node.get("/T")
        if t is not None:
            parts.append(str(t))
        node = node.get("/Parent")
        seen += 1
    return ".".join(reversed(parts))


def on_states(widget) -> list[str]:
    """For buttons: the appearance state names that mean 'on' (everything but /Off)."""
    ap = widget.get("/AP")
    if not ap:
        return []
    n = ap.get("/N")
    if not n or not hasattr(n, "keys"):
        return []
    return [str(k) for k in n.keys() if str(k) != "/Off"]


def extract_widgets(pdf: pikepdf.Pdf) -> list[dict]:
    """Walk every page's annotations and capture each Widget's geometry + identity."""
    out: list[dict] = []
    for page_index, page in enumerate(pdf.pages):
        mediabox = [float(x) for x in page.MediaBox]
        rotate = int(page.get("/Rotate", 0) or 0)
        annots = page.get("/Annots")
        if not annots:
            continue
        for a in annots:
            try:
                if a.get("/Subtype") != Name("/Widget"):
                    continue
                rect = a.get("/Rect")
                if rect is None:
                    continue
                x0, y0, x1, y1 = (float(v) for v in rect)
                ft = inherited(a, "/FT")
                is_btn = str(ft) == "/Btn" if ft is not None else False
                out.append(
                    {
                        "name": full_name(a),
                        "type": str(ft) if ft is not None else "?",
                        "page": page_index,
                        "pageWidth": round(mediabox[2] - mediabox[0], 2),
                        "pageHeight": round(mediabox[3] - mediabox[1], 2),
                        "rotate": rotate,
                        # Normalize to a MediaBox-origin, lower-left/upper-right box.
                        "rect": [
                            round(min(x0, x1) - mediabox[0], 2),
                            round(min(y0, y1) - mediabox[1], 2),
                            round(max(x0, x1) - mediabox[0], 2),
                            round(max(y0, y1) - mediabox[1], 2),
                        ],
                        # 'onState' is only meaningful for buttons (checkbox/radio).
                        "onState": (on_states(a) or [None])[0] if is_btn else None,
                    }
                )
            except Exception as e:  # noqa: BLE001 — never let one bad annot abort the file
                out.append({"name": "<error>", "error": str(e), "page": page_index})
    return out


def blank_form(pdf: pikepdf.Pdf) -> None:
    """Remove all sample data so we stamp onto a clean form.

    These PDFs store field values on objects that aren't all reachable from
    AcroForm/Fields (some widgets live only in a page's /Annots), so we sweep the
    whole object table and clear /V + /DV on anything field-like, drop every widget's
    appearance stream, and reset button states to /Off.
    """
    acro = pdf.Root.get("/AcroForm")
    if acro is not None:
        # Tell viewers to regenerate appearances from the (now-empty) values.
        acro.NeedAppearances = True

    for obj in pdf.objects:
        if not isinstance(obj, (pikepdf.Dictionary, pikepdf.Stream)):
            continue
        try:
            keys = set(obj.keys())
        except Exception:  # noqa: BLE001
            continue
        is_widget = obj.get("/Subtype") == Name("/Widget")
        field_like = is_widget or {"/FT", "/T", "/AS"} & keys
        if field_like:
            for key in ("/V", "/DV"):
                if key in keys:
                    del obj[key]
        if is_widget:
            if "/AP" in keys:
                del obj["/AP"]
            if "/AS" in keys:
                obj.AS = Name("/Off")


def strip_widgets(pdf: pikepdf.Pdf) -> None:
    """Remove the interactive form layer entirely (after rects are extracted).

    We stamp answers onto the page content, never the AcroForm — and some insurers' widgets
    carry an opaque /MK background that would paint over our stamps. Dropping all Widget
    annotations + the AcroForm yields a clean, truly-flattened template to draw on.
    """
    for page in pdf.pages:
        annots = page.get("/Annots")
        if annots is None:
            continue
        keep = [a for a in annots if a.get("/Subtype") != Name("/Widget")]
        if keep:
            page.Annots = pdf.make_indirect(pikepdf.Array(keep))
        elif "/Annots" in page:
            del page["/Annots"]
    if "/AcroForm" in pdf.Root:
        del pdf.Root["/AcroForm"]


def render_previews(template: Path, out_dir: Path) -> int:
    """Render each page to PNG for adapter authoring. Best-effort (needs poppler)."""
    if shutil.which("pdftoppm") is None:
        return 0
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["pdftoppm", "-png", "-r", "120", str(template), str(out_dir / "page")],
        check=False,
        capture_output=True,
    )
    return len(list(out_dir.glob("page*.png")))


def prepare(provider_id: str) -> dict:
    src_name = SOURCES[provider_id]
    src = DOWNLOADS / src_name
    if not src.exists():
        raise FileNotFoundError(f"source PDF not found: {src}")

    out_dir = OUT_ROOT / provider_id
    out_dir.mkdir(parents=True, exist_ok=True)

    pdf = pikepdf.open(str(src))
    widgets = extract_widgets(pdf)  # capture geometry BEFORE blanking
    blank_form(pdf)
    strip_widgets(pdf)  # remove the form layer so stamps are never covered

    template_path = out_dir / "template.pdf"
    pdf.save(
        str(template_path),
        object_stream_mode=pikepdf.ObjectStreamMode.disable,
        compress_streams=True,
        normalize_content=False,
    )

    fields_path = out_dir / "fields.json"
    fields_path.write_text(
        json.dumps(
            {"provider": provider_id, "source": src_name, "fields": widgets},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    n_png = render_previews(template_path, PREVIEW_ROOT / provider_id)
    types = {}
    for w in widgets:
        types[w.get("type", "?")] = types.get(w.get("type", "?"), 0) + 1
    return {
        "provider": provider_id,
        "pages": len(pdf.pages),
        "widgets": len(widgets),
        "types": types,
        "previews": n_png,
    }


def main() -> None:
    ids = sys.argv[1:] or list(SOURCES.keys())
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    for pid in ids:
        if pid not in SOURCES:
            print(f"!! unknown provider '{pid}' (known: {', '.join(SOURCES)})")
            continue
        try:
            summary = prepare(pid)
            print(
                f"OK  {summary['provider']:20s} pages={summary['pages']} "
                f"widgets={summary['widgets']:4d} types={summary['types']} "
                f"previews={summary['previews']}"
            )
        except Exception as e:  # noqa: BLE001
            print(f"ERR {pid:20s} {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
