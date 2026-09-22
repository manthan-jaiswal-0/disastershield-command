import httpx
import json

payload = {
    "citizen_reports": [],
    "image_evidence": []
}

response = httpx.post("http://localhost:8000/api/v1/analyze", json=payload)
print(f"Status: {response.status_code}")
print("Response JSON:")
print(json.dumps(response.json(), indent=2))
