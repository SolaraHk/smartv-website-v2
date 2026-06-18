#!/usr/bin/env python3
"""Smart V static server with explicit UTF-8 charset headers.

The public SmartV site is served from this Mac via cloudflared to a local
Python static server.  Python's default http.server returns text/html,
text/plain and application/xml without charset, which can make non-browser
crawlers decode Traditional Chinese as mojibake.  This wrapper keeps the same
SimpleHTTPRequestHandler behaviour but makes text-like assets explicit UTF-8.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
from pathlib import Path


class SmartVCharsetHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with UTF-8 content types for crawler-facing files."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        "": "application/octet-stream",
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".xml": "application/xml; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml; charset=utf-8",
        ".webmanifest": "application/manifest+json; charset=utf-8",
    }

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        super().end_headers()


class ReusableThreadingTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve SmartV static files with UTF-8 charset headers.")
    parser.add_argument("port", nargs="?", type=int, default=4399)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", default=".")
    args = parser.parse_args()

    directory = str(Path(args.directory).expanduser().resolve())
    handler = functools.partial(SmartVCharsetHandler, directory=directory)

    with ReusableThreadingTCPServer((args.bind, args.port), handler) as httpd:
        print(f"Serving SmartV from {directory} on http://{args.bind}:{args.port}/", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
