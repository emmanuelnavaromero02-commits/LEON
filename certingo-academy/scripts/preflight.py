import requests
import sys

def check():
    print("Checking Certingo Academy Deployment...")

    checks = [
        ("Backend Health", "http://localhost:8000/health"),
        ("Admin Control Room", "http://localhost:8000/api/academy/admin/control-room/status"),
        ("Questions API", "http://localhost:8000/api/academy/admin/questions"),
    ]

    success = True
    for name, url in checks:
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                print(f"[OK] {name}")
            else:
                print(f"[FAIL] {name} (Status: {r.status_code})")
                success = False
        except Exception as e:
            print(f"[FAIL] {name} (Error: {e})")
            success = False

    if not success:
        print("\nSome checks failed. Ensure servers are running.")
        sys.exit(1)
    else:
        print("\nAll systems operational.")

if __name__ == "__main__":
    check()
