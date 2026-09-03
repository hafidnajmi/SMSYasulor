import urllib.request
import json

BASE_URL = "http://localhost:5182"

def test_get_price_history():
    print("Testing GET /AdminManagement/GetPriceHistory?masterDataId=UPF-10588...")
    req = urllib.request.Request(f"{BASE_URL}/AdminManagement/GetPriceHistory?masterDataId=UPF-10588")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("Response JSON:")
        print(json.dumps(data, indent=2))
        assert data["success"] == True

if __name__ == "__main__":
    test_get_price_history()
