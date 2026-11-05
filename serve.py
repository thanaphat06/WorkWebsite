import http.server, socketserver, webbrowser, os

PORT = 8000  # แก้เลข port ตรงนี้ได้เลย
os.chdir(os.path.dirname(os.path.abspath(__file__)))  # เสิร์ฟโฟลเดอร์ของไฟล์นี้เสมอ

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"เปิดเว็บที่ {url}  (กด Ctrl+C เพื่อหยุด)")
    webbrowser.open(url)
    httpd.serve_forever()
