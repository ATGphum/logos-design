#!/usr/bin/env python3
"""Build preview.html — llm-interface.html with every asset inlined as a data URI.

Why: llm-interface.html references assets/*.webp with relative paths. That is the
version you commit — it diffs and merges cleanly. Some viewers (Claude Cowork's
preview pane, a file dropped into a chat, an email attachment) cannot reach the
sibling assets/ folder, so images appear broken there. This produces a single
self-contained file for those cases. preview.html is a build output: gitignored,
never edited by hand.

    python3 build-preview.py
"""
import base64, mimetypes, os, re, sys

SRC = "llm-interface.html"
OUT = "preview.html"

def main():
    if not os.path.exists(SRC):
        sys.exit(f"{SRC} not found — run this from the project folder.")
    html = open(SRC, encoding="utf-8").read()
    cache, missing = {}, []

    def inline(match):
        path = match.group(0)
        if path not in cache:
            if not os.path.exists(path):
                missing.append(path)
                return path
            mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
            data = base64.b64encode(open(path, "rb").read()).decode()
            cache[path] = f"data:{mime};base64,{data}"
        return cache[path]

    out = re.sub(r"assets/[A-Za-z0-9._-]+\.(?:webp|png|jpg|jpeg|gif|svg)", inline, html)
    open(OUT, "w", encoding="utf-8").write(out)

    print(f"{OUT}: {len(cache)} assets inlined, {len(out)/1e6:.2f} MB")
    if missing:
        print("MISSING (left as relative paths):")
        for m in sorted(set(missing)):
            print("  ", m)

if __name__ == "__main__":
    main()
