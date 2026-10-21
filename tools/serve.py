#!/usr/bin/env python3
"""本地预览服务器

python tools/serve.py              # http://127.0.0.1:8788
python tools/serve.py --port 9000
"""
import argparse
import http.server
import socketserver
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print(fmt % args)


def main():
    parser = argparse.ArgumentParser(description="研途打卡本地预览")
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()

    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", args.port), Handler) as server:
        print(f"研途打卡已启动： http://127.0.0.1:{args.port}/")
        print("Ctrl+C 停止。")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n收工，碗洗干净了。")


if __name__ == "__main__":
    main()
