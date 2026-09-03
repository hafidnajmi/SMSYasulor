"""
locustfile.py - Performance & Load Testing Suite for UPMS Application

Simulates high-concurrency database queries, master data search operations, 
KPI summary aggregation, and transaction throughput.

Run in Web UI mode:
    python -m locust -f locustfile.py

Run in Headless mode (100 users, 10 spawn rate, 1 minute duration):
    python -m locust -f locustfile.py --headless -u 100 -r 10 --run-time 1m
"""

import time
import random
from locust import User, task, between, events
from database import Database

# Shared database instance for load testing
db = Database()

class DatabaseUser(User):
    """
    Locust User simulating database query load and transaction processing
    under peak operational conditions.
    """
    wait_time = between(0.1, 0.5)  # Fast task loop to simulate heavy load

    @task(5)
    def test_search_master_data(self):
        """Simulate quick search queries on Master Data table."""
        start_time = time.time()
        search_terms = ["BEARING", "SEAL", "FILTER", "VALVE", "BELT", "UPF"]
        query = random.choice(search_terms)
        try:
            results = db.get_master_data(search=query, limit=50)
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_master_data_search",
                response_time=duration_ms,
                response_length=len(results),
                exception=None,
            )
        except Exception as ex:
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_master_data_search",
                response_time=duration_ms,
                response_length=0,
                exception=ex,
            )

    @task(3)
    def test_kpi_summary_stats(self):
        """Simulate dashboard KPI aggregation queries."""
        start_time = time.time()
        try:
            stats = db.get_master_data_kpi_summary()
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_master_data_kpi_summary",
                response_time=duration_ms,
                response_length=len(stats),
                exception=None,
            )
        except Exception as ex:
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_master_data_kpi_summary",
                response_time=duration_ms,
                response_length=0,
                exception=ex,
            )

    @task(2)
    def test_barang_keluar_history(self):
        """Simulate loading Barang Keluar history table."""
        start_time = time.time()
        try:
            rows = db.get_barang_keluar_history()
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_barang_keluar_history",
                response_time=duration_ms,
                response_length=len(rows),
                exception=None,
            )
        except Exception as ex:
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_QUERY",
                name="get_barang_keluar_history",
                response_time=duration_ms,
                response_length=0,
                exception=ex,
            )

    @task(1)
    def test_sequence_generation(self):
        """Simulate high-concurrency SQL Server sequence generation."""
        start_time = time.time()
        try:
            seq_id = db._next_upf_id("seq_upf_bmasuk")
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_SEQUENCE",
                name="seq_upf_bmasuk_nextval",
                response_time=duration_ms,
                response_length=len(str(seq_id)),
                exception=None,
            )
        except Exception as ex:
            duration_ms = (time.time() - start_time) * 1000
            events.request.fire(
                request_type="SQL_SEQUENCE",
                name="seq_upf_bmasuk_nextval",
                response_time=duration_ms,
                response_length=0,
                exception=ex,
            )
