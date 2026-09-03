import urllib.request
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

URL = "http://localhost:5182/BarangKeluar"
CONCURRENT_USERS = 100

def fetch_url(user_id):
    start_time = time.time()
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": f"TestUser/{user_id}"})
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            elapsed = time.time() - start_time
            return user_id, status, elapsed
    except Exception as e:
        elapsed = time.time() - start_time
        return user_id, str(e), elapsed

def run_stress_test():
    print(f"Running Concurrency Test with {CONCURRENT_USERS} simultaneous users to {URL}...")
    start_all = time.time()
    results = []
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        futures = [executor.submit(fetch_url, i+1) for i in range(CONCURRENT_USERS)]
        for future in as_completed(futures):
            results.append(future.result())
            
    total_time = time.time() - start_all
    successes = [r for r in results if r[1] == 200]
    errors = [r for r in results if r[1] != 200]
    latencies = [r[2] for r in successes]
    
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0
    
    print("\n--- STRESS TEST RESULTS ---")
    print(f"Total Simultaneous Users : {CONCURRENT_USERS}")
    print(f"Successful Requests (200) : {len(successes)} / {CONCURRENT_USERS} ({(len(successes)/CONCURRENT_USERS)*100:.1f}%)")
    print(f"Failed Requests          : {len(errors)}")
    print(f"Total Test Time          : {total_time:.2f} seconds")
    print(f"Average Request Latency   : {avg_latency*1000:.1f} ms")
    print(f"Min Request Latency       : {min_latency*1000:.1f} ms")
    print(f"Max Request Latency       : {max_latency*1000:.1f} ms")
    print(f"Throughput                : {CONCURRENT_USERS / total_time:.1f} req/sec")

if __name__ == "__main__":
    run_stress_test()
