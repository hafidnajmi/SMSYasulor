"""
Database Module - SQL Server Connection and Operations (Production)

Key improvements:
  - Thread-local connection pool with auto-reconnect
  - Credentials via environment variables (UPMS_DB_HOST / UPMS_DB_PASS)
  - SQL Server SEQUENCE for race-condition-free UPF ID generation
  - Structured logging (logs/upms.log) with daily rotation
  - Audit trail (Audit_Log table) for INSERT/UPDATE/DELETE
  - Soft-delete (is_deleted) on Master_Data
"""

import re
import pyodbc
import bcrypt
import os
import json
import yaml
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from utils.logger import get_logger
from utils import db_pool
from utils.paths import get_app_dir

log = get_logger("UPMS.DB")

# ── Security: Column filter whitelist (immutable — cannot be modified at runtime) ──
# Used by get_master_data() and count_master_data() to prevent column injection.
# Only column names explicitly listed here are allowed in dynamic SQL fragments.
MASTER_DATA_FILTER_WHITELIST: frozenset = frozenset({"up_area", "category", "frequency", "bin", "id"})



def _get_best_odbc_driver(preferred_driver: Optional[str] = None) -> str:
    """
    Detect and return the best available ODBC driver for SQL Server (NFT-010).
    Priority order:
      1. Environment variable UPMS_DB_DRIVER / config preferred driver
      2. ODBC Driver 18 for SQL Server
      3. ODBC Driver 17 for SQL Server
      4. ODBC Driver 13 for SQL Server
      5. SQL Server Native Client 11.0
      6. SQL Server (Default Windows driver)
    """
    if preferred_driver and preferred_driver not in ["sqlserver", "auto"]:
        return preferred_driver

    env_driver = os.environ.get('UPMS_DB_DRIVER')
    if env_driver:
        return env_driver

    try:
        installed = pyodbc.drivers()
    except Exception:
        installed = []

    priority_list = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "ODBC Driver 13 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server"
    ]

    for drv in priority_list:
        if drv in installed:
            return drv

    return "ODBC Driver 17 for SQL Server"


def _build_sqlserver_connection_string(host: str, db_name: str, user: str, pwd: str, driver: str) -> str:
    """
    Build connection string with full compatibility for ODBC Driver 17 & 18 (NFT-010).
    Handles Encrypt and TrustServerCertificate parameters to prevent SSL/TLS handshake failures.
    """
    base_params = [
        f"DRIVER={{{driver}}}",
        f"SERVER={host}",
        f"DATABASE={db_name}",
        "TrustServerCertificate=yes",
        "MARS_Connection=yes",
    ]

    # Explicit Encryption control for ODBC Driver 18
    if "18" in driver:
        # ODBC Driver 18 defaults to Encrypt=yes; TrustServerCertificate=yes avoids self-signed SSL errors
        base_params.append("Encrypt=yes")
    else:
        # ODBC Driver 17 & earlier
        base_params.append("Encrypt=no")

    if user and pwd:
        base_params.extend([f"UID={user}", f"PWD={pwd}"])
    else:
        base_params.append("Trusted_Connection=yes")

    return ";".join(base_params) + ";"


class Database:
    """SQL Server database handler — production-grade with pooling, logging & audit."""

    @staticmethod
    def _now_str() -> str:
        """Return timezone-aware local timestamp string in 'YYYY-MM-DD HH:MM:SS' format (ST-033)."""
        return datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S')

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database connection.
        Credentials resolved in priority order (NFT-017):
          1. Environment variables (UPMS_DB_HOST, UPMS_DB_NAME, UPMS_DB_USER, UPMS_DB_PASS)
          2. config_local.yaml (local dev override, bypassed in production mode)
          3. config.yaml (base production configuration)
        """
        self.config = {}
        app_dir = get_app_dir()
        config_prod_path  = os.path.join(app_dir, 'config.yaml')
        config_local_path = os.path.join(app_dir, 'config_local.yaml')

        # Step 1: Load base production config.yaml
        if os.path.exists(config_prod_path):
            try:
                with open(config_prod_path, 'r', encoding='utf-8') as f:
                    self.config = yaml.safe_load(f) or {}
            except Exception as e:
                log.error("[NFT-017] Failed to read base config.yaml: %s", e)

        # Step 2: Check production mode guard (UPMS_ENV=production or compiled EXE)
        import sys
        env_mode = os.environ.get('UPMS_ENV', '').lower() or os.environ.get('APP_ENV', '').lower()
        is_frozen = getattr(sys, 'frozen', False)
        is_production = (env_mode == 'production') or is_frozen

        # Step 3: Merge config_local.yaml if present AND NOT in production mode
        if not is_production and os.path.exists(config_local_path):
            try:
                with open(config_local_path, 'r', encoding='utf-8') as f:
                    local_cfg = yaml.safe_load(f) or {}
                    if isinstance(local_cfg, dict):
                        self.config = _deep_merge_dict(self.config, local_cfg)
                        log.info("[NFT-017] Loaded local configuration overrides from config_local.yaml")
            except Exception as e:
                log.warning("[NFT-017] Failed to load config_local.yaml: %s", e)
        elif is_production and os.path.exists(config_local_path):
            log.info("[NFT-017] Production mode active. Bypassing config_local.yaml to enforce config.yaml.")

        self._is_connected = True
        self._init_sqlserver()

    @property
    def sql_conn(self) -> Optional[pyodbc.Connection]:
        if not getattr(self, '_is_connected', True):
            return None
        try:
            return db_pool.get_connection()
        except Exception:
            return None

    @sql_conn.setter
    def sql_conn(self, value):
        self._is_connected = (value is not None)

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _cursor(self):
        """
        Return a cursor from the thread-local pooled connection.
        Automatically reconnects if the connection is stale.
        """
        return db_pool.get_connection().cursor()

    def _commit(self):
        """Commit the thread-local connection."""
        db_pool.get_connection().commit()

    # ST-014 FIX 1: Whitelist of allowed SQL Server sequence names
    _ALLOWED_SEQUENCES: frozenset = frozenset({
        "seq_upf_master", "seq_upf_bidding",
        "seq_upf_bmasuk", "seq_upf_bkeluar", "seq_upf_electrical_parts"
    })

    def _next_upf_id(self, sequence_name: str) -> str:
        """
        Generate the next atomic UPF-prefixed ID using a SQL Server SEQUENCE.
        Example: 'UPF-12804'
        Falls back to MAX+1 if sequence does not exist.
        """
        # ST-014: Validate sequence_name against whitelist before interpolating into SQL
        if sequence_name not in self._ALLOWED_SEQUENCES:
            log.error("[ST-014] Blocked illegal sequence name: %r", sequence_name)
            raise ValueError(f"[ST-014] Invalid sequence name: {sequence_name!r}")
        cur = self._cursor()
        try:
            cur.execute(f"SELECT NEXT VALUE FOR dbo.[{sequence_name}]")
            num = cur.fetchone()[0]
            return f"UPF-{num}"
        except Exception:
            table_map = {
                ("seq_upf_master", "id"):              "Master_Data",
                ("seq_upf_bidding", "id"):              "Bidding_History",
                ("seq_upf_bmasuk", "id"):               "Barang_Masuk",
                ("seq_upf_bkeluar", "id"):              "Barang_Keluar",
                ("seq_upf_electrical_parts", "part_number"): "electrical_parts",
            }
            table_info = None
            id_col = "id"
            for (seq, col), tbl in table_map.items():
                if seq == sequence_name:
                    table_info = tbl
                    id_col = col
                    break
            table = table_info or "Master_Data"
            # Use serializable hint to avoid race on fallback
            cur.execute(f"""
                SELECT ISNULL(MAX(CAST(SUBSTRING(CAST({id_col} AS VARCHAR(50)), 5, LEN(CAST({id_col} AS VARCHAR(50)))) AS INT)), 0)
                FROM dbo.[{table}] WITH (SERIALIZABLE, UPDLOCK)
                WHERE {id_col} LIKE 'UPF-%' AND ISNUMERIC(SUBSTRING(CAST({id_col} AS VARCHAR(50)), 5, LEN(CAST({id_col} AS VARCHAR(50))))) = 1
            """)
            num = (cur.fetchone()[0] or 0) + 1
            log.warning("SEQUENCE %s not found, using MAX+1 fallback: %d", sequence_name, num)
            return f"UPF-{num}"

    def _audit(self, action: str, table: str, record_id: str,
                changed_by: str = None, old: Dict = None, new: Dict = None):
        """
        Write an audit record to dbo.Audit_Log.
        action: 'INSERT' | 'UPDATE' | 'DELETE'
        Silently ignores failures so auditing never blocks business logic.
        """
        try:
            cur = self._cursor()
            cur.execute(
                "INSERT INTO dbo.Audit_Log "
                "(action, table_name, record_id, changed_by, old_value, new_value) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    action, table, str(record_id), changed_by,
                    json.dumps(old, default=str) if old else None,
                    json.dumps(new, default=str) if new else None,
                )
            )
            self._commit()
        except Exception as e:
            log.warning("Audit write failed (%s %s %s): %s", action, table, record_id, e)

    @staticmethod
    def _sanitize_like(value: str) -> str:
        """
        Escape SQL LIKE wildcard characters to prevent wildcard abuse / ReDoS.
        Escapes: % _ [ characters by wrapping them in brackets per SQL Server syntax.
        The VALUE is still passed as a bound parameter — this only prevents
        unintended wildcard matching, not SQL injection (already handled by parameterization).
        """
        return re.sub(r'([%_\[\]])', r'[\1]', str(value))

    @staticmethod
    def _sql_rows_to_dicts(cursor) -> List[Dict]:
        """Convert pyodbc cursor rows to a list of plain dicts."""
        cols = [col[0] for col in cursor.description]
        rows = []
        has_curr = "current_unit_price" in cols
        has_unit = "unit_price" in cols
        for row in cursor.fetchall():
            d = dict(zip(cols, row))
            if has_curr and not has_unit:
                d["unit_price"] = d["current_unit_price"]
            rows.append(d)
        return rows

    def _inject_price_snapshots(self, data: Dict) -> Dict:
        """Inject Unit_Price, Total_Cost, unit_price_snapshot, total_cost_snapshot into Barang_Keluar insert data."""
        res = dict(data)
        qty = float(res.get("qty") or 0)
        bin_code = res.get("bin")
        master_id = res.get("master_data_id") or res.get("master_id")

        unit_price = 0.0
        if master_id:
            unit_price = self.get_price_for_master_data(master_id)
        elif bin_code:
            try:
                cur = self._cursor()
                cur.execute("SELECT id FROM dbo.Master_Data WHERE bin = ? AND (is_deleted = 0 OR is_deleted IS NULL)", (bin_code,))
                row = cur.fetchone()
                if row:
                    unit_price = self.get_price_for_master_data(row[0])
            except Exception as ex:
                log.warning("Failed to resolve master_id for bin %s: %s", bin_code, ex)

        res["unit_price_snapshot"] = unit_price
        res["total_cost_snapshot"] = qty * unit_price
        res["Unit_Price"] = unit_price
        res["Total_Cost"] = qty * unit_price
        return res

    def create_barang_keluar(self, data: Dict) -> str:
        """Create new outgoing item record in SQL Server. Returns new UPF- id."""
        if not self.sql_conn: return ""
        new_id = self._next_upf_id("seq_upf_bkeluar")
        data = self._inject_price_snapshots(data)
        data['created_at'] = self._now_str()
        insert_data = {k: v for k, v in data.items() if k != 'id'}
        columns = ', '.join(insert_data.keys())
        placeholders = ', '.join(['?' for _ in data])
        cursor = self.sql_conn.cursor()
        cursor.execute(f"INSERT INTO dbo.Barang_Keluar ({columns}) VALUES ({placeholders})", list(insert_data.values()))
        self.sql_conn.commit()

        # Learn compatibility silently
        m_id = data.get("master_data_id") or data.get("master_id")
        if not m_id and data.get("bin"):
            try:
                cursor.execute("SELECT id FROM dbo.Master_Data WHERE bin = ? AND (is_deleted = 0 OR is_deleted IS NULL)", (data.get("bin"),))
                row = cursor.fetchone()
                if row: m_id = row[0]
            except Exception as ex:
                log.warning("BIN lookup failed in create_barang_keluar: %s", ex)
        if m_id:
            try:
                self.record_actual_usage(m_id, data.get("line"), data.get("machine_id"), data.get("pic"))
            except Exception as ex:
                log.warning("Auto learning failed in create_barang_keluar: %s", ex)

        return new_id

    def create_barang_keluar_with_stock(self, data: Dict) -> str:
        """Create outgoing record AND update stock atomically in 1 transaction."""
        if not self.sql_conn: return ""
        new_id = self._next_upf_id("seq_upf_bkeluar")
        data = self._inject_price_snapshots(data)
        data['created_at'] = self._now_str()
        insert_data = {k: v for k, v in data.items() if k != 'id'}
        columns = ', '.join(insert_data.keys())
        placeholders = ', '.join(['?' for _ in data])
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            conn.autocommit = False
            cursor.execute(f"INSERT INTO dbo.Barang_Keluar ({columns}) VALUES ({placeholders})", list(insert_data.values()))
            cursor.execute(
                "UPDATE dbo.Master_Data SET current_stock = current_stock - ?, updated_at = ? WHERE bin = ?",
                (float(data.get('qty', 0)), self._now_str(), data.get('bin', ''))
            )
            conn.commit()

            # Learn compatibility silently
            m_id = data.get("master_data_id") or data.get("master_id")
            if not m_id and data.get("bin"):
                cursor.execute("SELECT id FROM dbo.Master_Data WHERE bin = ? AND (is_deleted = 0 OR is_deleted IS NULL)", (data.get("bin"),))
                row = cursor.fetchone()
                if row: m_id = row[0]
            if m_id:
                self.record_actual_usage(m_id, data.get("line"), data.get("machine_id"), data.get("pic"))

            return new_id
        except Exception as ex:
            conn.rollback()
            log.warning("create_barang_keluar_with_stock auto learning failed: %s", ex)
            raise
        finally:
            conn.autocommit = True

    def get_barang_keluar(self, search: str = "", year: str = "") -> List[Dict]:
        """Get outgoing items history with optional search and year filter."""
        cur = self._cursor()
        query = """
            SELECT bk.*, m.machine_code, m.machine_name 
            FROM dbo.Barang_Keluar bk
            LEFT JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
        """
        params = []
        if search:
            like = f"%{search}%"
            query += " AND (bk.bin LIKE ? OR bk.item_name LIKE ? OR bk.pic LIKE ? OR bk.line LIKE ? OR bk.master_id LIKE ? OR bk.bin IN (SELECT bin FROM dbo.Master_Data WHERE id LIKE ?) OR m.machine_code LIKE ? OR m.machine_name LIKE ?)"
            params.extend([like, like, like, like, like, like, like, like])
        if year and year != "All":
            query += " AND YEAR(bk.tanggal) = ?"
            params.append(int(year))
        query += " ORDER BY bk.created_at DESC"
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def delete_barang_keluar(self, record_id) -> bool:
        """Delete a barang keluar record."""
        cur = self._cursor()
        cur.execute("DELETE FROM dbo.Barang_Keluar WHERE id = ?", (str(record_id),))
        self._commit()
        ok = cur.rowcount > 0
        if ok:
            self._audit('DELETE', 'Barang_Keluar', str(record_id))
            log.info("Barang Keluar deleted: %s", record_id)
        return ok

    # ==================== Barang Masuk Methods (SQL Server) ====================

    def create_barang_masuk(self, data: Dict) -> str:
        """Create new incoming item record. Returns 'SUCCESS' (NFT-008 Sequence ID)."""
        data = dict(data)
        if 'id' not in data or not data.get('id'):
            data['id'] = self._next_upf_id("seq_upf_bmasuk")
        data['created_at'] = self._now_str()
        if 'remark' in data and 'remarks' not in data:
            data['remarks'] = data.pop('remark')
        if 'tanggal' in data and hasattr(data['tanggal'], 'strftime'):
            data['tanggal'] = data['tanggal'].strftime('%Y-%m-%d')
        cur = self._cursor()
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        cur.execute(f"INSERT INTO dbo.Barang_Masuk ({columns}) VALUES ({placeholders})", list(data.values()))
        self._commit()
        log.info("Barang Masuk created (id=%s bin=%s qty=%s)", data.get('id'), data.get('bin'), data.get('qty'))
        return "SUCCESS"

    def create_barang_masuk_with_stock(self, data: Dict) -> str:
        """Create incoming record AND increase stock atomically in 1 transaction (NFT-008).
        Also auto-updates current_unit_price in Master_Data if purchase_price > 0.
        """
        data = dict(data)
        if 'id' not in data or not data.get('id'):
            data['id'] = self._next_upf_id("seq_upf_bmasuk")
        data['created_at'] = self._now_str()
        if 'remark' in data and 'remarks' not in data:
            data['remarks'] = data.pop('remark')
        if 'tanggal' in data and hasattr(data['tanggal'], 'strftime'):
            data['tanggal'] = data['tanggal'].strftime('%Y-%m-%d')
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            conn.autocommit = False
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?' for _ in data])
            cursor.execute(f"INSERT INTO dbo.Barang_Masuk ({columns}) VALUES ({placeholders})", list(data.values()))
            now_ts = self._now_str()
            cursor.execute(
                "UPDATE dbo.Master_Data SET current_stock = current_stock + ?, updated_at = ? WHERE bin = ?",
                (float(data.get('qty', 0)), now_ts, data.get('bin', ''))
            )
            # Auto-update current_unit_price from purchase_price if provided and > 0
            purchase_price = data.get('purchase_price')
            if purchase_price is not None:
                try:
                    purchase_price = float(purchase_price)
                except (TypeError, ValueError):
                    purchase_price = 0.0
            if purchase_price and purchase_price > 0:
                cursor.execute(
                    "UPDATE dbo.Master_Data SET current_unit_price = ?, updated_at = ? WHERE bin = ?",
                    (purchase_price, now_ts, data.get('bin', ''))
                )
                log.info("Auto-updated current_unit_price=%.2f for bin=%s from Barang Masuk", purchase_price, data.get('bin'))
            conn.commit()
            log.info("Barang Masuk with stock update (bin=%s qty=%s)", data.get('bin'), data.get('qty'))
            return "SUCCESS"
        except Exception as ex:
            conn.rollback()
            log.error("create_barang_masuk_with_stock failed and rolled back: %s", ex)
            raise
        finally:
            conn.autocommit = True

    def get_barang_masuk(self, search: str = "", year: str = "") -> List[Dict]:
        """Get incoming items history."""
        cur = self._cursor()
        query = "SELECT * FROM dbo.Barang_Masuk WHERE 1=1"
        params = []
        if search:
            like = f"%{search}%"
            query += " AND (bin LIKE ? OR item_name LIKE ? OR po_number LIKE ? OR part_number LIKE ? OR pic LIKE ? OR supplier LIKE ? OR bin IN (SELECT bin FROM dbo.Master_Data WHERE id LIKE ?))"
            params.extend([like, like, like, like, like, like, like])
        if year and year != "All":
            query += " AND YEAR(created_at) = ?"
            params.append(year)
        query += " ORDER BY created_at DESC"
        cur.execute(query, params)
        rows = self._sql_rows_to_dicts(cur)
        for r in rows:
            if r.get('tanggal') and hasattr(r['tanggal'], 'strftime'):
                r['tanggal'] = r['tanggal'].strftime('%d %b %Y')
        return rows

    def delete_barang_masuk(self, record_id) -> bool:
        """Delete a barang masuk record (does NOT reverse stock)."""
        cur = self._cursor()
        cur.execute("DELETE FROM dbo.Barang_Masuk WHERE id = ?", (str(record_id),))
        self._commit()
        ok = cur.rowcount > 0
        if ok:
            self._audit('DELETE', 'Barang_Masuk', str(record_id))
            log.info("Barang Masuk deleted: %s", record_id)
        return ok

    def create_barang_keluar(self, data: Dict) -> str:
        """Create new outgoing item record using create_barang_keluar_with_cost."""
        data = dict(data)
        bin_code = data.get("bin") or data.get("bin_code") or ""
        item_name = data.get("item_name") or data.get("item") or ""
        try:
            qty = float(data.get("qty", 0))
        except (ValueError, TypeError):
            qty = 0.0
        tanggal = data.get("tanggal") or data.get("date") or self._now_str()
        pic = data.get("pic")
        line = data.get("line")
        rem_name = data.get("rem_name") or data.get("remarks") or data.get("machine") or ""
        user_id = data.get("user_id")
        
        return self.create_barang_keluar_with_cost(
            tanggal=tanggal,
            bin_code=bin_code,
            item_name=item_name,
            qty=qty,
            rem_name=rem_name,
            line=line,
            pic=pic,
            user_id=user_id,
            approval_status='approved'
        )

    # ==================== Electrical Parts Methods ====================

    def get_electrical_parts(
        self,
        search: str = "",
        filter_place: str = "",
        limit: int = 0,
        offset: int = 0,
    ) -> List[Dict]:
        """Get electrical_parts records with optional search, place filter, and pagination from SQL Server."""
        if not self.sql_conn:
            return []
        cursor = self.sql_conn.cursor()
        query = "SELECT * FROM dbo.electrical_parts WHERE 1=1"
        params = []

        if search:
            like = f"%{search}%"
            query += " AND (items LIKE ? OR part_number LIKE ? OR place LIKE ? OR brand LIKE ? OR condition LIKE ?)"
            params.extend([like, like, like, like, like])

        if filter_place:
            query += " AND place = ?"
            params.append(filter_place)

        query += " ORDER BY place ASC, part_number ASC"

        if limit > 0:
            query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
            params.extend([offset, limit])

        cursor.execute(query, params)
        return self._sql_rows_to_dicts(cursor)

    def count_electrical_parts(
        self, search: str = "", filter_place: str = ""
    ) -> int:
        """Count electrical_parts records in SQL Server."""
        if not self.sql_conn:
            return 0
        cursor = self.sql_conn.cursor()
        query = "SELECT COUNT(*) FROM dbo.electrical_parts WHERE 1=1"
        params = []

        if search:
            like = f"%{search}%"
            query += " AND (items LIKE ? OR part_number LIKE ? OR place LIKE ? OR brand LIKE ? OR condition LIKE ?)"
            params.extend([like, like, like, like, like])

        if filter_place:
            query += " AND place = ?"
            params.append(filter_place)

        cursor.execute(query, params)
        res = cursor.fetchone()
        return res[0] if res else 0

    def create_electrical_parts(self, data: Dict) -> str:
        """Create new electrical_parts record in SQL Server. Auto-computes value = qty * price_per_unit. Returns UPF- id."""
        if not self.sql_conn:
            return ""
        cursor = self.sql_conn.cursor()
        data = dict(data)
        new_id = self._next_upf_id("seq_upf_electrical_parts")
        data['part_number'] = new_id
        try:
            data['value'] = float(data.get('qty') or 0) * float(data.get('price_per_unit') or 0)
        except Exception:
            data['value'] = 0
        data['created_at'] = self._now_str()
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        cursor.execute(
            f"INSERT INTO dbo.electrical_parts ({columns}) VALUES ({placeholders})",
            list(data.values()),
        )
        self.sql_conn.commit()
        return new_id

    def update_electrical_parts(self, record_id: str, data: Dict) -> bool:
        """Update an electrical_parts record in SQL Server. Auto-recomputes value."""
        if not self.sql_conn:
            return False
        cursor = self.sql_conn.cursor()
        data = dict(data)
        try:
            data['value'] = float(data.get('qty') or 0) * float(data.get('price_per_unit') or 0)
        except Exception:
            data['value'] = 0
        set_clause = ', '.join([f"{k} = ?" for k in data.keys()])
        cursor.execute(
            f"UPDATE dbo.electrical_parts SET {set_clause} WHERE part_number = ?",
            list(data.values()) + [record_id],
        )
        self.sql_conn.commit()
        return cursor.rowcount > 0

    def delete_electrical_parts(self, record_id: str) -> bool:
        """Delete an electrical_parts record in SQL Server."""
        if not self.sql_conn:
            return False
        cursor = self.sql_conn.cursor()
        cursor.execute("DELETE FROM dbo.electrical_parts WHERE part_number = ?", (record_id,))
        self.sql_conn.commit()
        return cursor.rowcount > 0

    def get_electrical_stats(self) -> Dict:
        """Get summary statistics for electrical_parts from SQL Server."""
        stats = {"total": 0, "good": 0, "fair": 0, "poor": 0, "total_value": 0}
        if not self.sql_conn:
            return stats
        cursor = self.sql_conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM dbo.electrical_parts")
        stats["total"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COUNT(*) FROM dbo.electrical_parts WHERE condition = 'New' OR condition IS NULL OR condition = ''"
        )
        stats["good"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COUNT(*) FROM dbo.electrical_parts WHERE condition = 'Used'"
        )
        stats["fair"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT COUNT(*) FROM dbo.electrical_parts WHERE condition NOT IN ('New', 'Used') AND condition IS NOT NULL AND condition != ''"
        )
        stats["poor"] = cursor.fetchone()[0] or 0

        cursor.execute("SELECT SUM(value) FROM dbo.electrical_parts")
        res = cursor.fetchone()[0]
        stats["total_value"] = float(res) if res else 0

        return stats

    def get_electrical_places(self) -> List[str]:
        """Get distinct place values for filter dropdown from SQL Server."""
        if not self.sql_conn:
            return []
        cursor = self.sql_conn.cursor()
        cursor.execute(
            "SELECT DISTINCT place FROM dbo.electrical_parts "
            "WHERE place IS NOT NULL AND place != '' ORDER BY place ASC"
        )
        return [row[0] for row in cursor.fetchall()]

    def create_electrical_parts_keluar(
        self,
        part_number: str,
        qty: float,
        line: str = None,
        machine_id: int = None,
        pic: str = None,
        maintenance_type: str = None,
        remarks: str = None,
        tanggal: str = None,
        user_id: int = None,
        approval_status: str = 'approved'
    ) -> tuple:
        """Process outgoing transaction for an electrical part, deducting stock and recording to dbo.Barang_Keluar."""
        if not self.sql_conn:
            return (False, "Database connection not available", "")

        if not tanggal:
            tanggal = self._now_str()

        try:
            qty_num = float(qty)
            if qty_num <= 0:
                return (False, "Jumlah barang keluar harus lebih dari 0", "")
        except (ValueError, TypeError):
            return (False, "Jumlah barang keluar tidak valid", "")

        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT part_number, place, items, brand, qty, price_per_unit, value FROM dbo.electrical_parts WHERE part_number = ?",
                (part_number,)
            )
            row = cursor.fetchone()
            if not row:
                return (False, f"Electrical Part '{part_number}' tidak ditemukan di database!", "")

            p_num = row[0]
            place = row[1] or "-"
            item_name = row[2] or "Electrical Part"
            brand = row[3] or ""
            current_stock = float(row[4] or 0)
            price_per_unit = float(row[5] or 0)

            if approval_status == 'approved' and current_stock < qty_num:
                return (False, f"Stok electrical '{item_name}' ({part_number}) tidak mencukupi! Sisa stok: {current_stock}, Diminta: {qty_num}", "")

            # 1. Deduct stock in dbo.electrical_parts if approved
            if approval_status == 'approved':
                new_qty = max(0.0, current_stock - qty_num)
                new_val = new_qty * price_per_unit
                cursor.execute(
                    "UPDATE dbo.electrical_parts SET qty = ?, value = ? WHERE part_number = ?",
                    (new_qty, new_val, part_number)
                )

            # 2. Record transaction in dbo.Barang_Keluar
            total_cost = qty_num * price_per_unit

            insert_data = {
                "tanggal": tanggal,
                "bin": place,
                "item_name": f"[Electrical] {item_name}",
                "qty": qty_num,
                "rem_name": remarks or f"Electrical Part: {brand}",
                "master_id": None,
                "master_data_id": part_number,
                "line": line,
                "machine_id": machine_id,
                "maintenance_type": maintenance_type,
                "unit_price_snapshot": price_per_unit,
                "total_cost_snapshot": total_cost,
                "Unit_Price": price_per_unit,
                "Total_Cost": total_cost,
                "pic": pic,
                "user_id": user_id,
                "approval_status": approval_status,
                "created_at": self._now_str()
            }

            columns = ', '.join(insert_data.keys())
            placeholders = ', '.join(['?' for _ in insert_data])
            cursor.execute(f"INSERT INTO dbo.Barang_Keluar ({columns}) OUTPUT INSERTED.id VALUES ({placeholders})", list(insert_data.values()))
            res_row = cursor.fetchone()
            new_id = res_row[0] if res_row else 0

            conn.commit()
            return (True, "Barang Keluar Electrical Parts berhasil disimpan!", new_id)
        except Exception as ex:
            try:
                conn.rollback()
            except Exception:
                pass
            return (False, f"Gagal memproses barang keluar electrical: {ex}", "")

    def create_electrical_parts_masuk(self, data: Dict) -> tuple:
        """
        Process incoming transaction for an electrical part, increasing stock in dbo.electrical_parts
        and recording transaction in dbo.Barang_Masuk.
        """
        if not self.sql_conn:
            return (False, "Database connection not available", 0)

        tanggal = data.get("tanggal") or self._now_str()
        part_number = (data.get("part_number") or "").strip()
        place = (data.get("place") or data.get("bin") or "-").strip()
        item_name = (data.get("item_name") or data.get("item") or "").strip()
        brand = (data.get("brand") or "").strip()
        condition = (data.get("condition") or "New").strip()
        
        try:
            qty_num = float(data.get("qty") or 0)
            if qty_num <= 0:
                return (False, "Jumlah barang masuk harus lebih dari 0", 0)
        except (ValueError, TypeError):
            return (False, "Jumlah barang masuk tidak valid", 0)

        price_num = None
        if data.get("purchase_price") is not None and str(data.get("purchase_price")).strip() != "":
            try:
                price_num = float(data["purchase_price"])
            except (ValueError, TypeError):
                price_num = None

        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            # Check if electrical part exists
            existing = None
            if part_number:
                cursor.execute(
                    "SELECT part_number, qty, price_per_unit, place, items FROM dbo.electrical_parts WHERE part_number = ?",
                    (part_number,)
                )
                existing = cursor.fetchone()

            if existing:
                p_num = existing[0]
                current_qty = float(existing[1] or 0)
                curr_price = float(existing[2] or 0)
                final_price = price_num if (price_num is not None and price_num > 0) else curr_price
                new_qty = current_qty + qty_num
                new_val = new_qty * final_price
                
                # Update existing record
                cursor.execute(
                    """
                    UPDATE dbo.electrical_parts 
                    SET qty = ?, price_per_unit = ?, value = ?, 
                        place = CASE WHEN ? <> '' AND ? <> '-' THEN ? ELSE place END,
                        items = CASE WHEN ? <> '' THEN ? ELSE items END,
                        brand = CASE WHEN ? <> '' THEN ? ELSE brand END,
                        condition = CASE WHEN ? <> '' THEN ? ELSE condition END
                    WHERE part_number = ?
                    """,
                    (new_qty, final_price, new_val, place, place, place, item_name, item_name, brand, brand, condition, condition, p_num)
                )
                final_part_num = p_num
            else:
                # Create new electrical part if not exist
                new_pnum = part_number if part_number else self._next_upf_id("seq_upf_electrical_parts")
                final_price = price_num if price_num is not None else 0.0
                new_val = qty_num * final_price
                cursor.execute(
                    """
                    INSERT INTO dbo.electrical_parts (part_number, place, items, brand, qty, condition, price_per_unit, value, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                    """,
                    (new_pnum, place, item_name or "Electrical Part", brand, qty_num, condition, final_price, new_val)
                )
                final_part_num = new_pnum

            # Record in dbo.Barang_Masuk
            bm_data = {
                "tanggal": tanggal,
                "bin": place,
                "part_number": final_part_num,
                "item_name": f"[Electrical] {item_name}" if not item_name.startswith("[Electrical]") else item_name,
                "qty": qty_num,
                "purchase_price": price_num,
                "po_number": data.get("po_number"),
                "pic": data.get("pic"),
                "remarks": data.get("remarks"),
                "supplier": data.get("supplier"),
                "user_id": data.get("user_id"),
                "created_at": self._now_str()
            }
            columns = ', '.join(bm_data.keys())
            placeholders = ', '.join(['?' for _ in bm_data])
            cursor.execute(f"INSERT INTO dbo.Barang_Masuk ({columns}) OUTPUT INSERTED.id VALUES ({placeholders})", list(bm_data.values()))
            res_row = cursor.fetchone()
            new_bm_id = res_row[0] if res_row else 0

            conn.commit()
            return (True, f"Barang Masuk Electrical '{final_part_num}' berhasil disimpan! Stok bertambah {qty_num}.", new_bm_id)

        except Exception as ex:
            try:
                conn.rollback()
            except Exception:
                pass
            return (False, f"Gagal menyimpan barang masuk electrical: {ex}", 0)

    def get_electrical_barang_masuk_history(self, search: str = "", limit: int = 200) -> list:
        """Get history of electrical parts incoming transactions."""
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            query = """
                SELECT id, tanggal, bin, part_number, item_name, qty, purchase_price, po_number, pic, remarks, supplier, created_at
                FROM dbo.Barang_Masuk
                WHERE (item_name LIKE '[Electrical]%' OR part_number LIKE 'UPF-E%')
            """
            params = []
            if search:
                query += " AND (item_name LIKE ? OR part_number LIKE ? OR bin LIKE ? OR po_number LIKE ? OR supplier LIKE ?)"
                sp = f"%{search}%"
                params.extend([sp, sp, sp, sp, sp])

            query += f" ORDER BY id DESC OFFSET 0 ROWS FETCH NEXT {limit} ROWS ONLY"
            cursor.execute(query, params)
            rows = cursor.fetchall()

            res = []
            for r in rows:
                res.append({
                    "id": r[0],
                    "tanggal": r[1],
                    "bin": r[2],
                    "part_number": r[3],
                    "item_name": r[4],
                    "qty": r[5],
                    "purchase_price": r[6],
                    "po_number": r[7],
                    "pic": r[8],
                    "remarks": r[9],
                    "supplier": r[10],
                    "created_at": r[11],
                })
            return res
        except Exception as ex:
            return []

    

    def _check_and_run_migrations(self):
        """Fast check via dbo.Schema_Version table to avoid running 21 migration queries on every launch."""
        conn = db_pool.get_connection()
        cur = conn.cursor()
        CURRENT_SCHEMA_VERSION = 25
        try:
            cur.execute("""
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Schema_Version')
                BEGIN
                    CREATE TABLE dbo.Schema_Version (
                        version INT NOT NULL,
                        description NVARCHAR(255) NULL,
                        applied_at DATETIME DEFAULT GETDATE(),
                        applied_by NVARCHAR(100) NULL
                    );
                END
            """)
            conn.commit()
            cur.execute("SELECT MAX(version) FROM dbo.Schema_Version")
            row = cur.fetchone()
            if row and row[0] is not None and int(row[0]) >= CURRENT_SCHEMA_VERSION:
                log.info("Database schema version %d is up to date, skipping migration routines.", int(row[0]))
                self.purge_soft_deleted_master_data()
                return
        except Exception as ex:
            log.warning("Schema version check warning: %s", ex)

        self._migrate_create_sequences()
        self._migrate_sqlserver_users()
        self._migrate_sqlserver_supplier_table()
        self._migrate_sqlserver_email_features()
        self._migrate_sqlserver_master_image()
        self._migrate_sqlserver_barang_masuk_pic()
        self._migrate_sqlserver_barang_masuk_purchase_fields()
        self._migrate_sqlserver_barang_keluar_rem_name()
        self._migrate_sqlserver_email_v2()
        self._migrate_sqlserver_alert_rename()
        self._migrate_sqlserver_selected_for_rfq()
        self._migrate_sqlserver_supplier_offer_link()
        self._migrate_sqlserver_cost_intelligence()
        self._migrate_sqlserver_master_data_analysis_backup()
        self._migrate_sqlserver_production_line_normalization()
        self._migrate_master_data_price_fields()
        self._migrate_multi_currency_support()
        self._migrate_compatibility_learning_columns()
        self._migrate_sqlserver_supplier_offer_price_updated_at()
        self._migrate_approval_keluar()
        self._migrate_rename_tb16_to_b16()
        self._migrate_sqlserver_master_data_soft_delete()
        self._migrate_up_area_line_mapping()
        self._migrate_bidding_history_unique_constraint()
        self._normalize_table_names()
        self.purge_soft_deleted_master_data()

        try:
            cur.execute("INSERT INTO dbo.Schema_Version (version, description, applied_at, applied_by) VALUES (?, 'Schema v25 Migration: Enforce Unique Bidding History per Part & Year', GETDATE(), 'UPMS_System')", (CURRENT_SCHEMA_VERSION,))
            conn.commit()
            log.info("Recorded Schema_Version %d", CURRENT_SCHEMA_VERSION)
        except Exception as ex:
            log.warning("Could not record Schema_Version: %s", ex)

    def _migrate_bidding_history_unique_constraint(self):
        """Enforce unique constraint on Bidding_History (master_data_id, bidding_year)."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            # 1. Clean any existing duplicates in Bidding_History (keeping oldest ID)
            cursor.execute("""
                DELETE FROM dbo.Bidding_History
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM dbo.Bidding_History 
                    GROUP BY master_data_id, bidding_year
                )
            """)
            self.sql_conn.commit()

            # 2. Add Unique Constraint if not exists
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Bidding_History_Part_Year')
                BEGIN
                    ALTER TABLE dbo.Bidding_History ADD CONSTRAINT UQ_Bidding_History_Part_Year UNIQUE (master_data_id, bidding_year);
                END
            """)
            self.sql_conn.commit()
            log.info("[MIGRATE] Enforced UQ_Bidding_History_Part_Year unique constraint.")
        except Exception as ex:
            log.warning("Failed to enforce UQ_Bidding_History_Part_Year: %s", ex)

    def _migrate_sqlserver_master_data_soft_delete(self):
        """Ensure is_deleted BIT DEFAULT 0 and deleted_at DATETIME NULL exist in Master_Data."""
        conn = db_pool.get_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('dbo.Master_Data') AND name = 'is_deleted'
                )
                BEGIN
                    ALTER TABLE dbo.Master_Data ADD is_deleted BIT NOT NULL DEFAULT 0;
                END
            """)
            cur.execute("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('dbo.Master_Data') AND name = 'deleted_at'
                )
                BEGIN
                    ALTER TABLE dbo.Master_Data ADD deleted_at DATETIME NULL;
                END
            """)
            conn.commit()
            log.info("Checked/Added is_deleted and deleted_at columns to Master_Data table.")
        except Exception as e:
            log.warning("_migrate_sqlserver_master_data_soft_delete failed: %s", e)

    def _init_sqlserver(self):
        """
        Initialize the SQL Server connection pool.
        Credentials priority:
          1. Environment variables (UPMS_DB_HOST, UPMS_DB_NAME, UPMS_DB_USER, UPMS_DB_PASS)
          2. config_local.yaml / config.yaml
        """
        db_config = self.config.get('database', {}).get('production', {})

        host    = os.environ.get('UPMS_DB_HOST')    or db_config.get('host',     'localhost')
        db_name = os.environ.get('UPMS_DB_NAME')    or db_config.get('database', 'UPMS_Database')
        user    = os.environ.get('UPMS_DB_USER')    or db_config.get('user',     '')
        pwd     = os.environ.get('UPMS_DB_PASS')    or db_config.get('password', '')

        pref_driver = db_config.get('driver')
        driver = _get_best_odbc_driver(pref_driver)
        conn_str = _build_sqlserver_connection_string(host, db_name, user, pwd, driver)

        log.info("Connecting to SQL Server (%s -> %s, driver='%s', user=%s)", host, db_name, driver, user or "(Windows Auth)")

        try:
            db_pool.configure(conn_str)
            test = db_pool.get_connection()
            self.sql_conn = test
            log.info("SQL Server connected (%s -> %s)", host, db_name)

            # Acquire app lock so only 1 instance runs migrations at a time
            is_testing = os.environ.get('UPMS_TESTING') == '1'
            if is_testing:
                self._check_and_run_migrations()
            else:
                try:
                    with test.cursor() as cur:
                        cur.execute("""
                            DECLARE @result INT
                            EXEC @result = sp_getapplock @Resource='UPMS_Migration', @LockMode='Exclusive', @LockTimeout=0, @LockOwner='Session'
                            SELECT @result AS lock_result
                        """)
                        row = cur.fetchone()
                        lock_ok = row and row[0] >= 0
                        if lock_ok:
                            try:
                                self._check_and_run_migrations()
                            finally:
                                try:
                                    cur.execute("EXEC sp_releaseapplock @Resource='UPMS_Migration', @LockOwner='Session'")
                                except Exception as rel_e:
                                    log.warning("Migration lock release non-critical: %s", rel_e)
                        else:
                            log.info("Migration lock held by another instance, skipping migration.")
                except Exception as mig_e:
                    log.warning("Non-critical migration lock check: %s", mig_e)
        except Exception as e:
            log.critical("SQL Server connection FAILED: %s", e)
            self.sql_conn = None
            raise

    def close(self):
        """Close the thread-local DB connection for the current thread."""
        db_pool.close_all()
        self.sql_conn = None
        log.info("Database connection closed.")


    def _migrate_sqlserver_users(self):
        """Add missing columns to SQL Server dbo.Users table"""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        extra_cols = [
            ("full_name",          "NVARCHAR(255) DEFAULT ''"),
            ("last_login",         "DATETIME NULL"),
            ("can_master_data",    "INT DEFAULT 0"),
            ("can_admin_mgmt",     "INT DEFAULT 0"),
            ("can_bidding",        "INT DEFAULT 0"),
            ("can_settings",       "INT DEFAULT 0"),
            ("can_barang_masuk",   "INT DEFAULT 0"),
            ("can_riwayat",        "INT DEFAULT 0"),
            ("can_electrical_parts", "INT DEFAULT 1"),
            ("can_supplier_data",  "INT DEFAULT 0"),
            ("can_email_settings", "INT DEFAULT 0"),
            ("can_barang_keluar",  "INT DEFAULT 0"),
            ("can_master_machine", "INT DEFAULT 0"),
            ("can_sparepart_machine", "INT DEFAULT 0"),
            ("can_cost_intelligence", "INT DEFAULT 0"),
            ("can_pareto_analysis", "INT DEFAULT 0"),
            ("can_improvement_tracker", "INT DEFAULT 0"),
            ("can_master_data_analysis_backup", "INT DEFAULT 0"),
        ]
        for col, dflt in extra_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Users' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Users ADD {col} {dflt}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                print(f"[MIGRATE] {col}: {ex}")

    def _migrate_approval_keluar(self):
        """Add require_approval_keluar to Users and approval_status to Barang_Keluar."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        # Add require_approval_keluar column to Users
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Users' AND COLUMN_NAME='require_approval_keluar'
                )
                ALTER TABLE dbo.Users ADD require_approval_keluar BIT DEFAULT 1
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'require_approval_keluar' column to Users table.")
        except Exception as ex:
            print(f"[MIGRATE] require_approval_keluar on Users: {ex}")
        # Admin users default to no approval required
        try:
            cursor.execute("""
                UPDATE dbo.Users SET require_approval_keluar = 0
                WHERE role = 'admin' AND (require_approval_keluar IS NULL OR require_approval_keluar = 1)
            """)
            self.sql_conn.commit()
        except Exception as ex:
            print(f"[MIGRATE] Set require_approval_keluar=0 for admin: {ex}")
        # Add approval_status column to Barang_Keluar (default 'approved' so old data is unaffected)
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='approval_status'
                )
                ALTER TABLE dbo.Barang_Keluar ADD approval_status NVARCHAR(20) DEFAULT 'approved'
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'approval_status' column to Barang_Keluar table.")
        except Exception as ex:
            print(f"[MIGRATE] approval_status on Barang_Keluar: {ex}")
        # Add approved_by column to Barang_Keluar
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='approved_by'
                )
                ALTER TABLE dbo.Barang_Keluar ADD approved_by NVARCHAR(100) NULL
            """)
            self.sql_conn.commit()
        except Exception as ex:
            print(f"[MIGRATE] approved_by on Barang_Keluar: {ex}")
        # Add approved_at column to Barang_Keluar
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='approved_at'
                )
                ALTER TABLE dbo.Barang_Keluar ADD approved_at DATETIME NULL
            """)
            self.sql_conn.commit()
        except Exception as ex:
            print(f"[MIGRATE] approved_at on Barang_Keluar: {ex}")

    def _migrate_rename_tb16_to_b16(self):
        """Rename/replace any occurrence of line TB16/TB-16/TB 16 to B16 across all database tables."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            # 1. Update Master_Data up_area
            cursor.execute("""
                UPDATE dbo.Master_Data
                SET up_area = 'B16'
                WHERE UPPER(RTRIM(LTRIM(up_area))) IN ('TB16', 'TB-16', 'TB 16')
            """)

            # 2. Handle master_line and sparepart_line_mapping re-linking
            cursor.execute("SELECT id, line_code FROM dbo.master_line WHERE UPPER(RTRIM(LTRIM(line_code))) IN ('TB16', 'TB-16', 'TB 16', 'B16')")
            rows = cursor.fetchall()
            b16_id = None
            tb16_ids = []
            for r in rows:
                lid, lcode = r[0], r[1].strip().upper()
                if lcode == 'B16':
                    b16_id = lid
                else:
                    tb16_ids.append(lid)

            if not b16_id and tb16_ids:
                b16_id = tb16_ids.pop(0)
                cursor.execute("UPDATE dbo.master_line SET line_code = 'B16', line_name = 'Line B16' WHERE id = ?", (b16_id,))

            if b16_id and tb16_ids:
                for old_id in tb16_ids:
                    cursor.execute("UPDATE dbo.sparepart_line_mapping SET line_id = ? WHERE line_id = ?", (b16_id, old_id))
                    cursor.execute("DELETE FROM dbo.master_line WHERE id = ?", (old_id,))

            # 3. Update Machine_Master line
            cursor.execute("""
                UPDATE dbo.Machine_Master
                SET line = 'B16'
                WHERE UPPER(RTRIM(LTRIM(line))) IN ('TB16', 'TB-16', 'TB 16')
            """)

            # 4. Update Barang_Keluar line if column exists
            cursor.execute("""
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='line')
                UPDATE dbo.Barang_Keluar
                SET line = 'B16'
                WHERE UPPER(RTRIM(LTRIM(line))) IN ('TB16', 'TB-16', 'TB 16')
            """)

            self.sql_conn.commit()
            print("[MIGRATE] Checked/Migrated line TB16 to B16 across database tables.")
        except Exception as ex:
            log.error("Failed to migrate TB16 to B16: %s", ex)

    def _migrate_sqlserver_cost_intelligence(self):
        """Run cost intelligence migrations (Machine_Master, Sparepart_Machine_Usage, columns, etc)"""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        
        # 1. Machine_Master Table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Machine_Master' AND xtype='U')
                CREATE TABLE dbo.Machine_Master (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_code NVARCHAR(50) UNIQUE NOT NULL,
                    machine_name NVARCHAR(200) NOT NULL,
                    line NVARCHAR(100) NOT NULL,
                    area NVARCHAR(50) NULL,
                    machine_type NVARCHAR(100) NULL,
                    manufacturer NVARCHAR(100) NULL,
                    model NVARCHAR(100) NULL,
                    status NVARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME NULL
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created Machine_Master table.")
        except Exception as ex:
            log.error("Failed to migrate Machine_Master: %s", ex)
            
        # 2. Sparepart_Machine_Usage Table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Sparepart_Machine_Usage' AND xtype='U')
                CREATE TABLE dbo.Sparepart_Machine_Usage (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    master_data_id NVARCHAR(30) NOT NULL,
                    machine_id INT NOT NULL,
                    qty_need_year DECIMAL(18,2) NULL DEFAULT 0,
                    safety_stock DECIMAL(18,2) NULL DEFAULT 0,
                    criticality NVARCHAR(20) DEFAULT 'medium',
                    is_active INT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME NULL,
                    CONSTRAINT FK_Sparepart_Machine_Usage_Master FOREIGN KEY (master_data_id) REFERENCES dbo.Master_Data(id),
                    CONSTRAINT FK_Sparepart_Machine_Usage_Machine FOREIGN KEY (machine_id) REFERENCES dbo.Machine_Master(id),
                    CONSTRAINT UQ_Sparepart_Machine_Usage UNIQUE (master_data_id, machine_id)
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created Sparepart_Machine_Usage table.")
        except Exception as ex:
            log.error("Failed to migrate Sparepart_Machine_Usage: %s", ex)

        # 3. Improvement_Action Table (Removed)
        pass

        # 4. Add columns to Barang_Keluar
        bk_cols = [
            ("master_data_id", "NVARCHAR(50) NULL"),
            ("line", "NVARCHAR(100) NULL"),
            ("machine_id", "INT NULL"),
            ("maintenance_type", "NVARCHAR(50) NULL"),
            ("failure_reason", "NVARCHAR(100) NULL"),
            ("action_note", "NVARCHAR(500) NULL"),
            ("unit_price_snapshot", "DECIMAL(18,2) NULL"),
            ("total_cost_snapshot", "DECIMAL(18,2) NULL"),
        ]
        for col, dtype in bk_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Barang_Keluar ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add column %s to Barang_Keluar: %s", col, ex)

        # 5. Add columns to Master_Data (unit_price legacy column migration removed)
        pass

        # 6. Add permission columns to Users
        user_perms = [
            ("can_master_machine", "INT DEFAULT 0"),
            ("can_sparepart_machine", "INT DEFAULT 0"),
            ("can_cost_intelligence", "INT DEFAULT 0"),
            ("can_pareto_analysis", "INT DEFAULT 0"),
            ("can_improvement_tracker", "INT DEFAULT 0"),
            ("can_master_data_analysis_backup", "INT DEFAULT 0"),
        ]
        for col, dtype in user_perms:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Users' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Users ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add permission column %s to Users: %s", col, ex)
                
        # 7. Update existing admin users to have all cost intelligence permissions
        try:
            cursor.execute("""
                UPDATE dbo.Users
                SET can_master_machine = 1,
                    can_sparepart_machine = 1,
                    can_cost_intelligence = 1,
                    can_pareto_analysis = 1,
                    can_improvement_tracker = 1,
                    can_master_data_analysis_backup = 1
                WHERE role = 'admin'
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to update admin permissions: %s", ex)

    # ─── Price History Migration ──────────────────────────────────────────────────
    def _migrate_master_data_price_fields(self):
        """Add price tracking columns to Master_Data, create SPAREPART_PRICE_HISTORY table, and migrate Barang_Keluar cost columns."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()

        # 1. Add new price columns to Master_Data
        new_cols = [
            ("current_unit_price", "DECIMAL(18,2) NULL"),
            ("currency",           "NVARCHAR(10)  NULL"),
            ("last_price_update",  "DATETIME NULL"),
            ("last_updated_by",    "NVARCHAR(100) NULL"),
        ]
        for col, dtype in new_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Master_Data ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add %s to Master_Data: %s", col, ex)

        # 2. Seed default currency to IDR where missing
        try:
            cursor.execute("""
                UPDATE dbo.Master_Data
                SET currency = 'IDR'
                WHERE currency IS NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Set default currency=IDR for Master_Data.")
        except Exception as ex:
            log.error("Failed to seed currency: %s", ex)

        # 3. Create SPAREPART_PRICE_HISTORY table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SPAREPART_PRICE_HISTORY' AND xtype='U')
                CREATE TABLE dbo.SPAREPART_PRICE_HISTORY (
                    id             INT IDENTITY(1,1) PRIMARY KEY,
                    master_data_id NVARCHAR(30)   NOT NULL,
                    old_price      DECIMAL(18,2)  NULL,
                    new_price      DECIMAL(18,2)  NOT NULL,
                    currency       NVARCHAR(10)   NOT NULL DEFAULT 'IDR',
                    reason         NVARCHAR(200)  NOT NULL,
                    effective_date DATE           NOT NULL,
                    updated_by     NVARCHAR(100)  NOT NULL,
                    updated_at     DATETIME       NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_PH_MasterData FOREIGN KEY (master_data_id)
                        REFERENCES dbo.Master_Data(id)
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created SPAREPART_PRICE_HISTORY table.")
        except Exception as ex:
            log.error("Failed to create SPAREPART_PRICE_HISTORY: %s", ex)

        # 4. Add Unit_Price and Total_Cost columns to Barang_Keluar
        bk_new_cols = [
            ("Unit_Price", "DECIMAL(18,2) NULL"),
            ("Total_Cost", "DECIMAL(18,2) NULL"),
        ]
        for col, dtype in bk_new_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Barang_Keluar ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add %s to Barang_Keluar: %s", col, ex)

        # 5. Backfill Unit_Price and Total_Cost from snapshot columns
        try:
            cursor.execute("""
                UPDATE dbo.Barang_Keluar
                SET Unit_Price = ISNULL(Unit_Price, unit_price_snapshot),
                    Total_Cost = ISNULL(Total_Cost, total_cost_snapshot)
                WHERE Unit_Price IS NULL OR Total_Cost IS NULL
            """)
            cursor.execute("""
                UPDATE dbo.Barang_Keluar
                SET Total_Cost = qty * Unit_Price
                WHERE Total_Cost IS NULL AND Unit_Price IS NOT NULL AND qty IS NOT NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Backfilled Unit_Price and Total_Cost in Barang_Keluar.")
        except Exception as ex:
            log.error("Failed to backfill cost columns in Barang_Keluar: %s", ex)

    def _migrate_multi_currency_support(self):
        """Create dbo.EXCHANGE_RATES table and add multi-currency tracking fields (NFT-015)."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()

        # 1. Create EXCHANGE_RATES table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EXCHANGE_RATES' AND xtype='U')
                CREATE TABLE dbo.EXCHANGE_RATES (
                    id                 INT IDENTITY(1,1) PRIMARY KEY,
                    currency_code      NVARCHAR(10)   NOT NULL UNIQUE,
                    currency_name      NVARCHAR(100)  NOT NULL,
                    symbol             NVARCHAR(10)   NOT NULL,
                    rate_to_idr        DECIMAL(18,4)  NOT NULL,
                    updated_at         DATETIME       NOT NULL DEFAULT GETDATE(),
                    updated_by         NVARCHAR(100)  NOT NULL DEFAULT 'SYSTEM'
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created dbo.EXCHANGE_RATES table.")
        except Exception as ex:
            log.error("Failed to create dbo.EXCHANGE_RATES: %s", ex)

        # 2. Seed default exchange rates
        default_rates = [
            ("IDR", "Indonesian Rupiah",  "Rp",  1.0),
            ("USD", "US Dollar",          "$",   15800.0),
            ("EUR", "Euro",               "€",   17200.0),
            ("JPY", "Japanese Yen",       "¥",   105.0),
            ("SGD", "Singapore Dollar",   "S$",  11800.0),
        ]
        for code, name, sym, rate in default_rates:
            try:
                cursor.execute("SELECT 1 FROM dbo.EXCHANGE_RATES WHERE currency_code = ?", (code,))
                if not cursor.fetchone():
                    cursor.execute("""
                        INSERT INTO dbo.EXCHANGE_RATES (currency_code, currency_name, symbol, rate_to_idr, updated_by)
                        VALUES (?, ?, ?, ?, 'SYSTEM')
                    """, (code, name, sym, rate))
                    self.sql_conn.commit()
            except Exception as ex:
                log.warning("Failed to seed exchange rate %s: %s", code, ex)

        # 3. Add currency and exchange_rate_to_idr to Barang_Masuk
        bm_cols = [
            ("currency",             "NVARCHAR(10) DEFAULT 'IDR'"),
            ("exchange_rate_to_idr", "DECIMAL(18,4) DEFAULT 1.0"),
        ]
        for col, dtype in bm_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Barang_Masuk' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Barang_Masuk ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.warning("Failed to add %s to Barang_Masuk: %s", col, ex)

    def get_exchange_rates(self) -> List[Dict]:
        """Get all active exchange rates from SQL Server (NFT-015)."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("SELECT currency_code, currency_name, symbol, rate_to_idr, updated_at FROM dbo.EXCHANGE_RATES ORDER BY currency_code")
        cols = [column[0] for column in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def convert_currency(self, amount: float, from_curr: str = "IDR", to_curr: str = "IDR") -> float:
        """Convert amount between any currencies using exchange rates (NFT-015)."""
        if from_curr == to_curr or not amount:
            return float(amount or 0)
        rates = {r["currency_code"]: float(r["rate_to_idr"]) for r in self.get_exchange_rates()}
        from_rate = rates.get(from_curr.upper(), 1.0)
        to_rate = rates.get(to_curr.upper(), 1.0)
        amount_in_idr = float(amount) * from_rate
        return amount_in_idr / to_rate

    # ─── Price Update Methods ─────────────────────────────────────────────────────
    def update_sparepart_price(self, master_data_id: str, new_price: float,
                               currency: str, reason: str,
                               effective_date: str, updated_by: str) -> dict:
        """
        Atomically update Master_Data price and insert price history record.
        Returns {success: bool, error: str|None}.
        """
        if not self.sql_conn:
            return {"success": False, "error": "Not connected"}
        if new_price <= 0:
            return {"success": False, "error": "Price must be greater than zero"}
        if not reason or not reason.strip():
            return {"success": False, "error": "Reason is required"}
        if not currency or not currency.strip():
            return {"success": False, "error": "Currency is required"}

        conn = db_pool.get_connection()
        cur  = conn.cursor()
        try:
            # Get current price
            cur.execute("SELECT current_unit_price FROM dbo.Master_Data WHERE id = ?",
                        (master_data_id,))
            row = cur.fetchone()
            if not row:
                return {"success": False, "error": "Sparepart not found"}
            old_price = float(row[0] or 0)

            # Insert history record
            cur.execute("""
                INSERT INTO dbo.SPAREPART_PRICE_HISTORY
                    (master_data_id, old_price, new_price, currency, reason, effective_date, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (master_data_id, old_price, new_price,
                  currency.strip(), reason.strip(),
                  effective_date, updated_by))

            # Update Master_Data
            cur.execute("""
                UPDATE dbo.Master_Data
                SET current_unit_price = ?,
                    currency           = ?,
                    last_price_update  = GETDATE(),
                    last_updated_by    = ?,
                    updated_at         = GETDATE()
                WHERE id = ?
            """, (new_price, currency.strip(), updated_by, master_data_id))

            conn.commit()
            self._audit('UPDATE_PRICE', 'Master_Data', master_data_id, changed_by=updated_by, old={'current_unit_price': old_price}, new={'current_unit_price': new_price, 'currency': currency.strip(), 'reason': reason})
            log.info("Price updated id=%s old=%.2f new=%.2f by=%s", master_data_id, old_price, new_price, updated_by)
            return {"success": True, "error": None, "old_price": old_price}
        except Exception as ex:
            conn.rollback()
            log.error("update_sparepart_price failed id=%s: %s", master_data_id, ex)
            return {"success": False, "error": str(ex)}

    def get_price_history(self, master_data_id: str) -> list:
        """Return price history for a sparepart, newest first."""
        if not self.sql_conn:
            return []
        try:
            cur = self._cursor()
            cur.execute("""
                SELECT id, master_data_id, old_price, new_price, currency,
                       reason, effective_date, updated_by, updated_at
                FROM dbo.SPAREPART_PRICE_HISTORY
                WHERE master_data_id = ?
                ORDER BY updated_at DESC
            """, (master_data_id,))
            return self._sql_rows_to_dicts(cur)
        except Exception as ex:
            log.error("get_price_history failed id=%s: %s", master_data_id, ex)
            return []

    def get_master_data_kpi_summary(self) -> dict:
        """Return KPI stats for Master Sparepart page: total, inventory_value, avg_price, low_stock."""
        if not self.sql_conn:
            return {"total": 0, "inventory_value": 0.0, "avg_price": 0.0, "low_stock": 0}
        try:
            cur = self._cursor()
            cur.execute("""
                SELECT
                    COUNT(*)                                              AS total,
                    ISNULL(SUM(
                        ISNULL(current_stock,0)
                        * ISNULL(current_unit_price, 0)
                    ), 0)                                                AS inventory_value,
                    ISNULL(AVG(NULLIF(NULLIF(current_unit_price,0), NULL)), 0) AS avg_price,
                    SUM(CASE WHEN ISNULL(current_stock,0) < ISNULL(safety_stock,0) THEN 1 ELSE 0 END)
                                                                         AS low_stock
                FROM dbo.Master_Data
                WHERE (is_deleted = 0 OR is_deleted IS NULL)
            """)
            row = cur.fetchone()
            if not row:
                return {"total": 0, "inventory_value": 0.0, "avg_price": 0.0, "low_stock": 0}
            return {
                "total":           int(row[0] or 0),
                "inventory_value": float(row[1] or 0),
                "avg_price":       float(row[2] or 0),
                "low_stock":       int(row[3] or 0),
            }
        except Exception as ex:
            log.error("get_master_data_kpi_summary failed: %s", ex)
            return {"total": 0, "inventory_value": 0.0, "avg_price": 0.0, "low_stock": 0}

    # ─── Compatibility Learning Center Migration & Methods ─────────────────────────
    def _migrate_compatibility_learning_columns(self):
        """Add compatibility metadata columns to sparepart_line_mapping and Sparepart_Machine_Usage."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()

        # Columns to add
        new_cols = [
            ("mapping_source",   "NVARCHAR(20) DEFAULT 'MANUAL'"),
            ("usage_count",      "INT DEFAULT 1"),
            ("last_used_at",     "DATETIME NULL"),
            ("approved",         "INT DEFAULT 1"),  # legacy manual records are approved
            ("confidence_score", "DECIMAL(5,2) DEFAULT 0.00"),
            ("created_by",       "NVARCHAR(100) NULL"),
        ]

        # 1. sparepart_line_mapping
        for col, dtype in new_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='sparepart_line_mapping' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.sparepart_line_mapping ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add column %s to sparepart_line_mapping: %s", col, ex)

        # 2. Sparepart_Machine_Usage
        for col, dtype in new_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Sparepart_Machine_Usage' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Sparepart_Machine_Usage ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add column %s to Sparepart_Machine_Usage: %s", col, ex)

        # 3. Seed/backfill mapping_source & approved status for legacy NULLs
        try:
            cursor.execute("""
                UPDATE dbo.sparepart_line_mapping
                SET mapping_source = ISNULL(mapping_source, 'MANUAL'),
                    approved       = ISNULL(approved, 1),
                    usage_count    = ISNULL(usage_count, 1),
                    confidence_score = ISNULL(confidence_score, 0.00)
                WHERE mapping_source IS NULL OR approved IS NULL
            """)
            cursor.execute("""
                UPDATE dbo.Sparepart_Machine_Usage
                SET mapping_source = ISNULL(mapping_source, 'MANUAL'),
                    approved       = ISNULL(approved, 1),
                    usage_count    = ISNULL(usage_count, 1),
                    confidence_score = ISNULL(confidence_score, 0.00)
                WHERE mapping_source IS NULL OR approved IS NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Backfilled compatibility mappings with MANUAL and approved status.")
        except Exception as ex:
            log.error("Failed to backfill compatibility mapping metadata: %s", ex)

    def record_actual_usage(self, master_data_id: str, line: str, machine_id: int = None, username: str = None):
        """Silently learn line and machine compatibility from transaction actual usage."""
        if not self.sql_conn:
            return
        cur = self._cursor()
        now_str = self._now_str()
        user = username or "SYSTEM"
        
        # 1. Learn Line Mapping
        if line:
            line = line.strip().upper()
            
            # Resolve or create in master_line
            cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line,))
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (line, f"Line {line}"))
                line_id = cur.fetchone()[0]
            else:
                line_id = row[0]
                
            cur.execute("""
                SELECT id, usage_count, approved
                FROM dbo.sparepart_line_mapping 
                WHERE sparepart_id = ? AND line_id = ?
            """, (master_data_id, line_id))
            row = cur.fetchone()
            
            line_approved_val = 1 if machine_id else 0
            
            if row:
                mapping_id = row[0]
                cnt = int(row[1] or 0) + 1
                curr_approved = int(row[2] or 0)
                new_approved = 1 if (line_approved_val or curr_approved) else 0
                cur.execute("""
                    UPDATE dbo.sparepart_line_mapping
                    SET usage_count = ?, last_used_at = ?, is_active = 1, approved = ?, updated_at = GETDATE()
                    WHERE id = ?
                """, (cnt, now_str, new_approved, mapping_id))
            else:
                cur.execute("""
                    INSERT INTO dbo.sparepart_line_mapping 
                        (sparepart_id, line_id, mapping_source, usage_count, last_used_at, approved, created_by, is_active)
                    VALUES (?, ?, 'AUTO', 1, ?, ?, ?, 1)
                """, (master_data_id, line_id, now_str, line_approved_val, user))

            # Automatically append line to Master_Data.line column if not already present
            try:
                cur.execute("SELECT line FROM dbo.Master_Data WHERE id = ?", (master_data_id,))
                m_row = cur.fetchone()
                if m_row:
                    current_line_val = m_row[0] or ""
                    existing_tokens = [t.strip().upper() for t in current_line_val.split(",") if t.strip()]
                    new_tokens = [t.strip().upper() for t in line.split(",") if t.strip()]
                    
                    changed = False
                    for nt in new_tokens:
                        if nt and nt != "B23" and nt not in existing_tokens:
                            existing_tokens.append(nt)
                            changed = True
                    
                    if changed:
                        updated_line_str = ", ".join(existing_tokens)
                        cur.execute(
                            "UPDATE dbo.Master_Data SET line = ?, updated_at = GETDATE() WHERE id = ?",
                            (updated_line_str, master_data_id)
                        )
                        log.info("[AUTO LEARN LINE] Updated Master_Data line for %s: '%s' -> '%s'", master_data_id, current_line_val, updated_line_str)
            except Exception as ex_m:
                log.warning("Failed to update Master_Data line in record_actual_usage: %s", ex_m)
        
        # 2. Learn Machine Mapping
        if machine_id:
            try:
                mach_id = int(machine_id)
            except:
                mach_id = None
            if mach_id:
                cur.execute("""
                    SELECT id, usage_count 
                    FROM dbo.Sparepart_Machine_Usage 
                    WHERE master_data_id = ? AND machine_id = ?
                """, (master_data_id, mach_id))
                row = cur.fetchone()
                if row:
                    usage_id = row[0]
                    cnt = int(row[1] or 0) + 1
                    cur.execute("""
                        UPDATE dbo.Sparepart_Machine_Usage
                        SET usage_count = ?, last_used_at = ?, is_active = 1, updated_at = GETDATE()
                        WHERE id = ?
                    """, (cnt, now_str, usage_id))
                else:
                    cur.execute("""
                        INSERT INTO dbo.Sparepart_Machine_Usage 
                            (master_data_id, machine_id, qty_need_year, safety_stock, criticality, mapping_source, usage_count, last_used_at, approved, created_by, is_active)
                        VALUES (?, ?, 0, 0, 'medium', 'AUTO', 1, ?, 0, ?, 1)
                    """, (master_data_id, mach_id, now_str, user))
        self._commit()

    def get_compatibility_center_stats(self) -> dict:
        """Fetch statistics for Compatibility Center dashboard."""
        if not self.sql_conn:
            return {"total_learned": 0, "manual_mapping": 0, "pending_review": 0, "approved_mapping": 0, "auto_learned_today": 0}
        cur = self._cursor()
        try:
            # 1. Total Learned
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'AUTO') +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE mapping_source = 'AUTO')
            """)
            total_learned = cur.fetchone()[0] or 0

            # 2. Manual Mapping
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'MANUAL' OR mapping_source IS NULL) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE mapping_source = 'MANUAL' OR mapping_source IS NULL)
            """)
            manual_mapping = cur.fetchone()[0] or 0

            # 3. Pending Review
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE approved = 0 AND is_active = 1) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE approved = 0 AND is_active = 1)
            """)
            pending_review = cur.fetchone()[0] or 0

            # 4. Approved Mapping
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE approved = 1 AND is_active = 1) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE approved = 1 AND is_active = 1)
            """)
            approved_mapping = cur.fetchone()[0] or 0

            # 5. Auto Learned Today
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'AUTO' AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE mapping_source = 'AUTO' AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE))
            """)
            auto_learned_today = cur.fetchone()[0] or 0

            return {
                "total_learned": total_learned,
                "manual_mapping": manual_mapping,
                "pending_review": pending_review,
                "approved_mapping": approved_mapping,
                "auto_learned_today": auto_learned_today
            }
        except Exception as ex:
            log.error("Failed to get compatibility center stats: %s", ex)
            return {"total_learned": 0, "manual_mapping": 0, "pending_review": 0, "approved_mapping": 0, "auto_learned_today": 0}

    def get_line_compatibilities(self, search: str = "") -> list:
        """Get all active line mappings, searchable by sparepart id, item, or line."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        query = """
            SELECT 
                lm.id,
                lm.sparepart_id AS master_data_id,
                md.item AS sparepart_name,
                ml.line_code AS line,
                lm.mapping_source,
                lm.usage_count,
                lm.approved,
                lm.last_used_at,
                lm.confidence_score
            FROM dbo.sparepart_line_mapping lm
            JOIN dbo.Master_Data md ON lm.sparepart_id = md.id
            JOIN dbo.master_line ml ON lm.line_id = ml.id
            WHERE lm.is_active = 1
        """
        params = []
        if search:
            query += " AND (lm.sparepart_id LIKE ? OR md.item LIKE ? OR ml.line_code LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])
        query += " ORDER BY lm.last_used_at DESC, lm.id DESC"
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_machine_compatibilities(self, search: str = "") -> list:
        """Get all active machine mappings, searchable by sparepart, machine, or line."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        query = """
            SELECT 
                mu.id,
                mu.master_data_id,
                md.item AS sparepart_name,
                m.machine_code,
                m.machine_name,
                m.line,
                mu.mapping_source,
                mu.usage_count,
                mu.approved,
                mu.last_used_at,
                mu.confidence_score
            FROM dbo.Sparepart_Machine_Usage mu
            JOIN dbo.Master_Data md ON mu.master_data_id = md.id
            JOIN dbo.Machine_Master m ON mu.machine_id = m.id
            WHERE mu.is_active = 1
        """
        params = []
        if search:
            query += " AND (mu.master_data_id LIKE ? OR md.item LIKE ? OR m.machine_code LIKE ? OR m.machine_name LIKE ? OR m.line LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term, term, term])
        query += " ORDER BY mu.last_used_at DESC, mu.id DESC"
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_pending_compatibilities(self) -> dict:
        """Retrieve pending (approved = 0) line and machine mappings."""
        if not self.sql_conn:
            return {"lines": [], "machines": []}
        cur = self._cursor()
        try:
            # Auto-approve any pending line mappings if there is a corresponding machine mapping
            cur.execute("""
                UPDATE lm
                SET lm.approved = 1, lm.updated_at = GETDATE()
                FROM dbo.sparepart_line_mapping lm
                JOIN dbo.master_line ml ON lm.line_id = ml.id
                JOIN dbo.Sparepart_Machine_Usage mu ON lm.sparepart_id = mu.master_data_id
                JOIN dbo.Machine_Master m ON mu.machine_id = m.id AND m.line = ml.line_code
                WHERE lm.approved = 0 AND lm.is_active = 1
            """)
            self._commit()

            # 1. Pending Lines
            cur.execute("""
                SELECT 
                    lm.id,
                    lm.sparepart_id AS master_data_id,
                    md.item AS sparepart_name,
                    md.bin AS bin,
                    ml.line_code AS line,
                    lm.mapping_source,
                    lm.usage_count,
                    lm.last_used_at
                FROM dbo.sparepart_line_mapping lm
                JOIN dbo.Master_Data md ON lm.sparepart_id = md.id
                JOIN dbo.master_line ml ON lm.line_id = ml.id
                WHERE lm.approved = 0 AND lm.is_active = 1
                ORDER BY lm.id DESC
            """)
            lines = self._sql_rows_to_dicts(cur)

            # 2. Pending Machines
            cur.execute("""
                SELECT 
                    mu.id,
                    mu.master_data_id,
                    md.item AS sparepart_name,
                    md.bin AS bin,
                    m.machine_code,
                    m.machine_name,
                    m.line,
                    mu.mapping_source,
                    mu.usage_count,
                    mu.last_used_at
                FROM dbo.Sparepart_Machine_Usage mu
                JOIN dbo.Master_Data md ON mu.master_data_id = md.id
                JOIN dbo.Machine_Master m ON mu.machine_id = m.id
                WHERE mu.approved = 0 AND mu.is_active = 1
                ORDER BY mu.id DESC
            """)
            machines = self._sql_rows_to_dicts(cur)

            return {"lines": lines, "machines": machines}
        except Exception as ex:
            log.error("get_pending_compatibilities failed: %s", ex)
            return {"lines": [], "machines": []}

    def approve_compatibility(self, mapping_type: str, mapping_id: int) -> bool:
        """Approve compatibility mapping (set approved = 1)."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            if mapping_type == "line":
                cur.execute("UPDATE dbo.sparepart_line_mapping SET approved = 1, updated_at = GETDATE() WHERE id = ?", (mapping_id,))
            else:
                cur.execute("UPDATE dbo.Sparepart_Machine_Usage SET approved = 1, updated_at = GETDATE() WHERE id = ?", (mapping_id,))
                
                cur.execute("""
                    SELECT mu.master_data_id, m.line
                    FROM dbo.Sparepart_Machine_Usage mu
                    JOIN dbo.Machine_Master m ON mu.machine_id = m.id
                    WHERE mu.id = ?
                """, (mapping_id,))
                row = cur.fetchone()
                if row:
                    sp_id, line_code = row[0], row[1]
                    cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
                    line_row = cur.fetchone()
                    if line_row:
                        line_id = line_row[0]
                        cur.execute("""
                            UPDATE dbo.sparepart_line_mapping 
                            SET approved = 1, updated_at = GETDATE() 
                            WHERE sparepart_id = ? AND line_id = ? AND approved = 0 AND is_active = 1
                        """, (sp_id, line_id))
            self._commit()
            return cur.rowcount > 0
        except Exception as ex:
            log.error("approve_compatibility failed type=%s id=%s: %s", mapping_type, mapping_id, ex)
            return False

    def reject_compatibility(self, mapping_type: str, mapping_id: int) -> bool:
        """Reject compatibility mapping (deactivates/deletes record from recommendations)."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            if mapping_type == "line":
                cur.execute("UPDATE dbo.sparepart_line_mapping SET is_active = 0, updated_at = GETDATE() WHERE id = ?", (mapping_id,))
                
                cur.execute("""
                    SELECT lm.sparepart_id, ml.line_code
                    FROM dbo.sparepart_line_mapping lm
                    JOIN dbo.master_line ml ON lm.line_id = ml.id
                    WHERE lm.id = ?
                """, (mapping_id,))
                row = cur.fetchone()
                if row:
                    sp_id, line_code = row[0], row[1]
                    cur.execute("""
                        UPDATE dbo.Sparepart_Machine_Usage
                        SET is_active = 0, updated_at = GETDATE()
                        WHERE master_data_id = ? AND approved = 0 AND machine_id IN (
                            SELECT id FROM dbo.Machine_Master WHERE line = ?
                        )
                    """, (sp_id, line_code))
            else:
                cur.execute("UPDATE dbo.Sparepart_Machine_Usage SET is_active = 0, updated_at = GETDATE() WHERE id = ?", (mapping_id,))
            self._commit()
            return cur.rowcount > 0
        except Exception as ex:
            log.error("reject_compatibility failed type=%s id=%s: %s", mapping_type, mapping_id, ex)
            return False

    def update_pending_compatibility(self, mapping_type: str, mapping_id: int, new_value: str) -> bool:
        """Update pending compatibility mapping to a new line_code or machine_code."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            if mapping_type == "line":
                cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (new_value,))
                row = cur.fetchone()
                if not row:
                    cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (new_value, f"Line {new_value}"))
                    line_id = cur.fetchone()[0]
                else:
                    line_id = row[0]
                
                cur.execute("UPDATE dbo.sparepart_line_mapping SET line_id = ?, updated_at = GETDATE() WHERE id = ?", (line_id, mapping_id))
            else:
                cur.execute("SELECT id FROM dbo.Machine_Master WHERE machine_code = ? AND (is_deleted = 0 OR is_deleted IS NULL)", (new_value,))
                row = cur.fetchone()
                if not row:
                    log.warning("update_pending_compatibility machine not found: %s", new_value)
                    return False
                machine_id = row[0]
                
                cur.execute("UPDATE dbo.Sparepart_Machine_Usage SET machine_id = ?, updated_at = GETDATE() WHERE id = ?", (machine_id, mapping_id))
            
            self._commit()
            return cur.rowcount > 0
        except Exception as ex:
            log.error("update_pending_compatibility failed type=%s id=%s val=%s: %s", mapping_type, mapping_id, new_value, ex)
            return False

    def get_machine_operational_stats(self, machine_id: int) -> dict:
        """Fetch asset cost summaries, failure frequencies, and breakdown analytics for a machine."""
        if not self.sql_conn:
            return {"total_cost": 0.0, "cost_this_month": 0.0, "cost_this_year": 0.0, "failures": 0, "failure_reasons": [], "monthly_trend": [], "sparepart_ranking": []}
        cur = self._cursor()
        try:
            # 1. Costs
            cur.execute("""
                SELECT 
                    ISNULL(SUM(Total_Cost), 0) as total_cost,
                    ISNULL(SUM(CASE WHEN MONTH(tanggal) = MONTH(GETDATE()) AND YEAR(tanggal) = YEAR(GETDATE()) THEN Total_Cost ELSE 0 END), 0) as cost_this_month,
                    ISNULL(SUM(CASE WHEN YEAR(tanggal) = YEAR(GETDATE()) THEN Total_Cost ELSE 0 END), 0) as cost_this_year,
                    COUNT(CASE WHEN maintenance_type IS NOT NULL AND maintenance_type <> '' THEN 1 END) as failures
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
            """, (machine_id,))
            row = cur.fetchone()
            stats = {
                "total_cost": float(row[0] or 0),
                "cost_this_month": float(row[1] or 0),
                "cost_this_year": float(row[2] or 0),
                "failures": int(row[3] or 0)
            }

            # 2. Maintenance Types breakdown
            cur.execute("""
                SELECT maintenance_type, COUNT(*) as cnt
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND maintenance_type IS NOT NULL AND maintenance_type <> ''
                GROUP BY maintenance_type
                ORDER BY cnt DESC
            """, (machine_id,))
            stats["failure_reasons"] = [{"reason": r[0], "count": r[1]} for r in cur.fetchall()]

            # 3. Monthly Cost Trend (last 12 months)
            cur.execute("""
                SELECT TOP 12 YEAR(tanggal) as yr, MONTH(tanggal) as mn, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
                GROUP BY YEAR(tanggal), MONTH(tanggal)
                ORDER BY yr DESC, mn DESC
            """, (machine_id,))
            stats["monthly_trend"] = [{"year": r[0], "month": r[1], "cost": float(r[2] or 0)} for r in cur.fetchall()]
            stats["monthly_trend"].reverse()

            # 4. Spareparts Ranking
            cur.execute("""
                SELECT master_data_id, item_name, SUM(Total_Cost) as total_cost, SUM(qty) as total_qty
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
                GROUP BY master_data_id, item_name
                ORDER BY total_cost DESC
            """, (machine_id,))
            stats["sparepart_ranking"] = [{"part_number": r[0], "item_name": r[1], "total_cost": float(r[2] or 0), "qty": float(r[3] or 0)} for r in cur.fetchall()]

            return stats
        except Exception as ex:
            log.error("get_machine_operational_stats failed: %s", ex)
            return {"total_cost": 0.0, "cost_this_month": 0.0, "cost_this_year": 0.0, "failures": 0, "failure_reasons": [], "monthly_trend": [], "sparepart_ranking": []}

    def get_inventory_intelligence_stats(self) -> dict:
        """Compute ABC classification, FSD moving analysis, safety stock warnings, and turnover rates."""
        if not self.sql_conn:
            return {"abc": [], "fsd": [], "reorder": [], "turnover": 0.0, "total_value": 0.0}
        cur = self._cursor()
        try:
            # 1. Load spareparts and their annual consumption
            cur.execute("""
                SELECT 
                    id, item, current_stock, safety_stock,
                    ISNULL(current_unit_price, 0) as price,
                    ISNULL((SELECT SUM(Total_Cost) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_consumption,
                    ISNULL((SELECT COUNT(*) FROM dbo.Barang_Keluar WHERE master_data_id = Master_Data.id AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())), 0) as annual_tx_count
                FROM dbo.Master_Data
                WHERE is_deleted = 0 OR is_deleted IS NULL
            """)
            parts = []
            total_consumption = 0.0
            total_value = 0.0
            for r in cur.fetchall():
                p_val = float(r[2] or 0) * float(r[4] or 0)
                total_value += p_val
                con = float(r[5] or 0)
                total_consumption += con
                parts.append({
                    "id": r[0],
                    "item": r[1],
                    "stock": float(r[2] or 0),
                    "safety": float(r[3] or 0),
                    "price": float(r[4] or 0),
                    "annual_consumption": con,
                    "tx_count": int(r[6] or 0),
                    "stock_value": p_val
                })

            # Sort descending for ABC
            parts.sort(key=lambda x: x["annual_consumption"], reverse=True)
            running_sum = 0.0
            abc_list = []
            for p in parts:
                running_sum += p["annual_consumption"]
                pct = (running_sum / total_consumption * 100.0) if total_consumption > 0 else 100.0
                if pct <= 80.0:
                    cls = "A"
                elif pct <= 95.0:
                    cls = "B"
                else:
                    cls = "C"
                p["abc_class"] = cls
                abc_list.append(p)

            # FSD moving analysis
            fsd_list = []
            for p in parts:
                tx = p["tx_count"]
                if tx > 12:
                    m_type = "Fast"
                elif tx >= 1:
                    m_type = "Slow"
                else:
                    m_type = "Dead"
                p["fsd_class"] = m_type
                fsd_list.append(p)

            # Reorder list
            reorder_list = [p for p in parts if p["stock"] < p["safety"]]

            # Turnover
            turnover = (total_consumption / total_value) if total_value > 0 else 0.0

            return {
                "abc": abc_list,
                "fsd": fsd_list,
                "reorder": reorder_list,
                "turnover": turnover,
                "total_value": total_value
            }
        except Exception as ex:
            log.error("get_inventory_intelligence_stats failed: %s", ex)
            return {"abc": [], "fsd": [], "reorder": [], "turnover": 0.0, "total_value": 0.0}

    def get_executive_dashboard_stats(self, year="All", month="All") -> dict:
        """Fetch today's total costs, top failure lines, highest cost assets, and inventory metrics with year/month filtering."""
        if not self.sql_conn:
            return {"today_cost": 0.0, "top_line": "-", "top_machine": "-", "top_sparepart": "-", "inventory_value": 0.0}
        cur = self._cursor()
        try:
            # 1. Today's Cost
            cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved') AND CAST(tanggal AS DATE) = CAST(GETDATE() AS DATE)")
            today_cost = float(cur.fetchone()[0] or 0)

            # Build filter conditions
            date_conds = []
            params = []
            if year and str(year) != "All":
                date_conds.append("YEAR(tanggal) = ?")
                params.append(int(year))
            if month and str(month) != "All":
                date_conds.append("MONTH(tanggal) = ?")
                params.append(int(month))
            
            filter_sql = (" AND " + " AND ".join(date_conds)) if date_conds else ""

            # 2. Top Line
            q2 = f"""
                SELECT TOP 1 line, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE line IS NOT NULL AND line <> '' AND (approval_status IS NULL OR approval_status = 'approved') {filter_sql}
                GROUP BY line
                ORDER BY cost DESC
            """
            cur.execute(q2, params)
            row = cur.fetchone()
            top_line = f"{row[0]} (Rp {float(row[1]):,.0f})".replace(",", ".") if row else "-"

            # 3. Top Machine
            bk_filter_sql = (" AND " + " AND ".join([c.replace("tanggal", "bk.tanggal") for c in date_conds])) if date_conds else ""
            q3 = f"""
                SELECT TOP 1 m.machine_name, SUM(bk.Total_Cost) as cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master m ON bk.machine_id = m.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved') {bk_filter_sql}
                GROUP BY m.machine_name
                ORDER BY cost DESC
            """
            cur.execute(q3, params)
            row = cur.fetchone()
            top_machine = f"{row[0]} (Rp {float(row[1]):,.0f})".replace(",", ".") if row else "-"

            # 4. Top Sparepart
            q4 = f"""
                SELECT TOP 1 item_name, SUM(Total_Cost) as cost
                FROM dbo.Barang_Keluar
                WHERE (approval_status IS NULL OR approval_status = 'approved') {filter_sql}
                GROUP BY item_name
                ORDER BY cost DESC
            """
            cur.execute(q4, params)
            row = cur.fetchone()
            top_sparepart = f"{row[0]} (Rp {float(row[1]):,.0f})".replace(",", ".") if row else "-"

            # 5. Inventory Value (fallback to Supplier_Offer lowest price if current_unit_price is null)
            cur.execute("""
                WITH StockValue AS (
                    SELECT 
                        current_stock,
                        ISNULL(current_unit_price, ISNULL((SELECT MIN(price) FROM dbo.Supplier_Offer WHERE master_data_id = Master_Data.id AND price > 0), 0)) as unit_price
                    FROM dbo.Master_Data
                    WHERE is_deleted = 0 OR is_deleted IS NULL
                )
                SELECT ISNULL(SUM(current_stock * unit_price), 0) FROM StockValue
            """)
            inv_value = float(cur.fetchone()[0] or 0)

            return {
                "today_cost": today_cost,
                "top_line": top_line,
                "top_machine": top_machine,
                "top_sparepart": top_sparepart,
                "inventory_value": inv_value
            }
        except Exception as ex:
            log.error("get_executive_dashboard_stats failed: %s", ex)
            return {"today_cost": 0.0, "top_line": "-", "top_machine": "-", "top_sparepart": "-", "inventory_value": 0.0}

    def get_total_outgoing_cost(self, year=None, month=None) -> float:
        """Fetch total outgoing sparepart cost, filtered by year and month. If filter is not set or 'All', returns all time cost."""
        if not self.sql_conn:
            return 0.0
        cur = self._cursor()
        try:
            query = "SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved')"
            params = []
            if year and str(year) != "All":
                query += " AND YEAR(tanggal) = ?"
                params.append(int(year))
            if month and str(month) != "All":
                query += " AND MONTH(tanggal) = ?"
                params.append(int(month))
            cur.execute(query, params)
            val = cur.fetchone()[0]
            return float(val or 0.0)
        except Exception as ex:
            log.error("get_total_outgoing_cost failed: %s", ex)
            return 0.0

    def get_sparepart_usage_analytics(self, sparepart_id: str) -> dict:
        """Fetch average monthly usage, lifecycle, ABC category, and historical transaction trend for a part."""
        if not self.sql_conn:
            return {"avg_monthly_usage": 0.0, "lifecycle": "Active", "abc_class": "C", "monthly_trend": [], "total_transactions": 0}
        cur = self._cursor()
        try:
            # 1. Total Tx count and sum qty
            cur.execute("""
                SELECT 
                    ISNULL(SUM(qty), 0) as total_qty,
                    COUNT(*) as tx_count
                FROM dbo.Barang_Keluar
                WHERE master_data_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())
            """, (sparepart_id,))
            row = cur.fetchone()
            total_qty = float(row[0] or 0)
            tx_count = int(row[1] or 0)
            avg_monthly = total_qty / 12.0

            # 2. Lifecycle determination
            cur.execute("SELECT current_stock FROM dbo.Master_Data WHERE id = ?", (sparepart_id,))
            st_row = cur.fetchone()
            stock = float(st_row[0] or 0) if st_row else 0.0
            
            if tx_count == 0 and stock == 0:
                lifecycle = "Obsolete / No Stock"
            elif tx_count == 0:
                lifecycle = "Dead Stock"
            elif tx_count < 3:
                lifecycle = "Slow Moving"
            else:
                lifecycle = "Active"

            # 3. Dynamic ABC class relative to total annual consumption
            cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())")
            grand_total = float(cur.fetchone()[0] or 0.001)

            cur.execute("SELECT ISNULL(SUM(Total_Cost), 0) FROM dbo.Barang_Keluar WHERE master_data_id = ? AND (approval_status IS NULL OR approval_status = 'approved') AND tanggal >= DATEADD(day, -365, GETDATE())", (sparepart_id,))
            part_total = float(cur.fetchone()[0] or 0)

            ratio = part_total / grand_total
            if ratio >= 0.05: # High contributor
                abc_class = "A"
            elif ratio >= 0.01:
                abc_class = "B"
            else:
                abc_class = "C"

            # 4. Monthly consumption trend
            cur.execute("""
                SELECT TOP 12 YEAR(tanggal) as yr, MONTH(tanggal) as mn, SUM(qty) as qty_sum
                FROM dbo.Barang_Keluar
                WHERE master_data_id = ?
                GROUP BY YEAR(tanggal), MONTH(tanggal)
                ORDER BY yr DESC, mn DESC
            """, (sparepart_id,))
            monthly_trend = [{"year": r[0], "month": r[1], "qty": float(r[2] or 0)} for r in cur.fetchall()]
            monthly_trend.reverse()

            return {
                "avg_monthly_usage": avg_monthly,
                "lifecycle": lifecycle,
                "abc_class": abc_class,
                "monthly_trend": monthly_trend,
                "total_transactions": tx_count
            }
        except Exception as ex:
            log.error("get_sparepart_usage_analytics failed: %s", ex)
            return {"avg_monthly_usage": 0.0, "lifecycle": "Active", "abc_class": "C", "monthly_trend": [], "total_transactions": 0}

    def get_spareparts_by_machine_id_dict(self, sparepart_id: str) -> dict:
        """Helper to get machine mappings as dictionary mapped by machine_id."""
        if not self.sql_conn:
            return {}
        cur = self._cursor()
        cur.execute("SELECT machine_id, qty_need_year, safety_stock, criticality, approved, mapping_source FROM dbo.Sparepart_Machine_Usage WHERE master_data_id = ? AND is_active = 1", (sparepart_id,))
        rows = cur.fetchall()
        return {r[0]: {"qty_need_year": r[1], "safety_stock": r[2], "criticality": r[3], "approved": r[4], "mapping_source": r[5]} for r in rows}

    def _migrate_sqlserver_sparepart_line_mapping(self):


        """Create SPAREPART_LINE_MAPPING table, indexes, and can_line_mapping permission column."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()

        # 1. Create SPAREPART_LINE_MAPPING table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SPAREPART_LINE_MAPPING' AND xtype='U')
                CREATE TABLE dbo.SPAREPART_LINE_MAPPING (
                    id             INT IDENTITY(1,1) PRIMARY KEY,
                    master_data_id NVARCHAR(30)  NOT NULL,
                    line           NVARCHAR(100) NOT NULL,
                    created_at     DATETIME      DEFAULT GETDATE(),
                    updated_at     DATETIME      NULL,
                    is_active      INT           DEFAULT 1,
                    CONSTRAINT FK_SLM_Master FOREIGN KEY (master_data_id) REFERENCES dbo.Master_Data(id),
                    CONSTRAINT UQ_SLM_Master_Line UNIQUE (master_data_id, line)
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created SPAREPART_LINE_MAPPING table.")
        except Exception as ex:
            log.error("Failed to migrate SPAREPART_LINE_MAPPING: %s", ex)

        # 2. Indexes
        slm_indexes = [
            ("IX_SLM_master_data_id", "dbo.SPAREPART_LINE_MAPPING (master_data_id)"),
            ("IX_SLM_line",           "dbo.SPAREPART_LINE_MAPPING (line)"),
        ]
        for name, target in slm_indexes:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '{name}'
                                   AND object_id = OBJECT_ID('dbo.SPAREPART_LINE_MAPPING'))
                    CREATE INDEX {name} ON {target}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to create SLM index %s: %s", name, ex)

        # 3. Add can_line_mapping column to Users
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Users' AND COLUMN_NAME='can_line_mapping'
                )
                ALTER TABLE dbo.Users ADD can_line_mapping INT DEFAULT 0
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to add can_line_mapping column: %s", ex)

        # 4. Grant can_line_mapping=1 to all admin users
        try:
            cursor.execute("""
                UPDATE dbo.Users SET can_line_mapping = 1 WHERE role = 'admin'
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to grant can_line_mapping to admins: %s", ex)

    def _auto_populate_sparepart_line_mapping(self):
        """
        Auto-migration: if SPAREPART_LINE_MAPPING is empty, parse Master_Data.line
        values and insert one row per clean token.  Runs only ONCE (first startup).
        Master_Data is NEVER modified.
        """
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()

        # Only run if the table is currently empty
        try:
            cursor.execute("SELECT COUNT(*) FROM dbo.SPAREPART_LINE_MAPPING")
            count = cursor.fetchone()[0]
            if count > 0:
                log.info("SPAREPART_LINE_MAPPING already populated (%d rows). Skipping auto-migration.", count)
                return
        except Exception as ex:
            log.error("Failed to check SPAREPART_LINE_MAPPING count: %s", ex)
            return

        log.info("SPAREPART_LINE_MAPPING is empty. Running auto-migration from Master_Data.line …")
        try:
            cursor.execute("""
                SELECT id, line FROM dbo.Master_Data
                WHERE is_deleted = 0 OR is_deleted IS NULL
            """)
            rows = cursor.fetchall()
        except Exception as ex:
            log.error("Failed to read Master_Data for SLM auto-migration: %s", ex)
            return

        inserted = 0
        skipped  = 0
        for master_id, raw_line in rows:
            clean_lines = self.normalize_line_value(raw_line)
            for line in clean_lines:
                if line == "UNKNOWN":
                    skipped += 1
                    continue
                try:
                    cursor.execute("""
                        IF NOT EXISTS (
                            SELECT 1 FROM dbo.SPAREPART_LINE_MAPPING
                            WHERE master_data_id = ? AND line = ?
                        )
                        INSERT INTO dbo.SPAREPART_LINE_MAPPING (master_data_id, line)
                        VALUES (?, ?)
                    """, (master_id, line, master_id, line))
                    inserted += 1
                except Exception as ex:
                    log.warning("SLM auto-migrate skip %s/%s: %s", master_id, line, ex)
                    skipped += 1

        try:
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to commit SLM auto-migration: %s", ex)
            return

        print(f"[MIGRATE] SPAREPART_LINE_MAPPING auto-populated: {inserted} rows inserted, {skipped} skipped.")
        log.info("SPAREPART_LINE_MAPPING auto-migration done: %d inserted, %d skipped.", inserted, skipped)

    def _migrate_sqlserver_production_line_normalization(self):
        """Create master_line, sparepart_line_mapping, machine_line and migrate all legacy line data to 3NF."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        
        # 1. Create master_line table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='master_line' AND xtype='U')
                CREATE TABLE dbo.master_line (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    line_code NVARCHAR(50) UNIQUE NOT NULL,
                    line_name NVARCHAR(200) NOT NULL,
                    area NVARCHAR(50) NULL,
                    status NVARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME NULL
                )
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to create master_line table: %s", ex)
            return

        # 2. Extract and seed master_line with unique line codes (Only if empty)
        try:
            cursor.execute("SELECT COUNT(*) FROM dbo.master_line")
            if cursor.fetchone()[0] == 0:
                all_raw_lines = set()
                cursor.execute("SELECT DISTINCT line FROM dbo.Master_Data WHERE line IS NOT NULL AND line != ''")
                for r in cursor.fetchall():
                    all_raw_lines.add(r[0])
                cursor.execute("SELECT DISTINCT line FROM dbo.Machine_Master WHERE line IS NOT NULL AND line != ''")
                for r in cursor.fetchall():
                    all_raw_lines.add(r[0])
                    
                unique_tokens = set()
                for rl in all_raw_lines:
                    tokens = self.normalize_line_value(rl)
                    for tok in tokens:
                        if tok != "UNKNOWN":
                            unique_tokens.add(tok)
                            
                for tok in sorted(list(unique_tokens)):
                    cursor.execute("""
                        IF NOT EXISTS (SELECT 1 FROM dbo.master_line WHERE line_code = ?)
                        INSERT INTO dbo.master_line (line_code, line_name, status)
                        VALUES (?, ?, 'active')
                    """, (tok, tok, f"Line {tok}"))
                self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to seed master_line: %s", ex)

        # Get line_code -> id mapping
        try:
            cursor.execute("SELECT line_code, id FROM dbo.master_line")
            line_map = {r[0]: r[1] for r in cursor.fetchall()}
        except Exception as ex:
            log.error("Failed to fetch master_line mapping: %s", ex)
            return

        # 3. Backup and Recreate sparepart_line_mapping
        try:
            # Check if legacy SPAREPART_LINE_MAPPING contains 'line' column
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='SPAREPART_LINE_MAPPING' AND COLUMN_NAME='line'
            """)
            has_legacy = cursor.fetchone()[0] > 0
            
            legacy_mappings = []
            if has_legacy:
                log.info("[MIGRATE] Backing up legacy SPAREPART_LINE_MAPPING data...")
                cursor.execute("""
                    SELECT master_data_id, line, is_active, approved, mapping_source, usage_count, last_used_at, confidence_score, created_by 
                    FROM dbo.SPAREPART_LINE_MAPPING
                """)
                legacy_mappings = cursor.fetchall()
                
                try:
                    cursor.execute("ALTER TABLE dbo.SPAREPART_LINE_MAPPING DROP CONSTRAINT FK_SLM_Master")
                except:
                    pass
                try:
                    cursor.execute("DROP TABLE dbo.SPAREPART_LINE_MAPPING")
                except:
                    pass
                self.sql_conn.commit()

            # Create normalized sparepart_line_mapping table
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sparepart_line_mapping' AND xtype='U')
                CREATE TABLE dbo.sparepart_line_mapping (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    sparepart_id NVARCHAR(30) NOT NULL,
                    line_id INT NOT NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME NULL,
                    is_active INT DEFAULT 1,
                    approved INT DEFAULT 1,
                    mapping_source NVARCHAR(20) DEFAULT 'MANUAL',
                    usage_count INT DEFAULT 1,
                    last_used_at DATETIME NULL,
                    confidence_score DECIMAL(5,2) DEFAULT 0.00,
                    created_by NVARCHAR(100) NULL,
                    CONSTRAINT FK_SLM_Normalized_Master FOREIGN KEY (sparepart_id) REFERENCES dbo.Master_Data(id),
                    CONSTRAINT FK_SLM_Normalized_Line FOREIGN KEY (line_id) REFERENCES dbo.master_line(id),
                    CONSTRAINT UQ_SLM_Normalized_Master_Line UNIQUE (sparepart_id, line_id)
                )
            """)
            self.sql_conn.commit()

            # Restore and split legacy mappings
            if legacy_mappings:
                for sm in legacy_mappings:
                    sp_id, raw_line, is_active, approved, mapping_source, usage_count, last_used_at, confidence_score, created_by = sm
                    tokens = self.normalize_line_value(raw_line)
                    for tok in tokens:
                        if tok in line_map:
                            line_id = line_map[tok]
                            cursor.execute("""
                                IF NOT EXISTS (SELECT 1 FROM dbo.sparepart_line_mapping WHERE sparepart_id = ? AND line_id = ?)
                                INSERT INTO dbo.sparepart_line_mapping 
                                    (sparepart_id, line_id, is_active, approved, mapping_source, usage_count, last_used_at, confidence_score, created_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (sp_id, line_id, sp_id, line_id, is_active, approved, mapping_source, usage_count, last_used_at, confidence_score, created_by))
                self.sql_conn.commit()
                log.info("[MIGRATE] Restored and split legacy sparepart line mappings.")
        except Exception as ex:
            log.error("Failed to migrate sparepart_line_mapping: %s", ex)

        # 4. Create machine_line table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='machine_line' AND xtype='U')
                CREATE TABLE dbo.machine_line (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_id INT NOT NULL,
                    line_id INT NOT NULL,
                    is_primary INT DEFAULT 1,
                    is_active INT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_ML_Normalized_Machine FOREIGN KEY (machine_id) REFERENCES dbo.Machine_Master(id),
                    CONSTRAINT FK_ML_Normalized_Line FOREIGN KEY (line_id) REFERENCES dbo.master_line(id),
                    CONSTRAINT UQ_ML_Normalized_Machine_Line UNIQUE (machine_id, line_id)
                )
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to create machine_line table: %s", ex)

        # 5. Migrate machine line mappings
        try:
            cursor.execute("SELECT id, line FROM dbo.Machine_Master")
            machines = cursor.fetchall()
            for mach in machines:
                m_id, raw_line = mach
                tokens = self.normalize_line_value(raw_line)
                for tok in tokens:
                    if tok in line_map:
                        line_id = line_map[tok]
                        cursor.execute("""
                            IF NOT EXISTS (SELECT 1 FROM dbo.machine_line WHERE machine_id = ? AND line_id = ?)
                            INSERT INTO dbo.machine_line (machine_id, line_id, is_primary)
                            VALUES (?, ?, 1)
                        """, (m_id, line_id, m_id, line_id))
            self.sql_conn.commit()

            # Migrate from legacy Machine_Line_Mapping (if exists)
            cursor.execute("""
                SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'Machine_Line_Mapping'
            """)
            if cursor.fetchone()[0] > 0:
                cursor.execute("SELECT machine_id, line, is_primary, is_active FROM dbo.Machine_Line_Mapping")
                mac_mappings = cursor.fetchall()
                for mm in mac_mappings:
                    m_id, raw_line, is_primary, is_active = mm
                    tokens = self.normalize_line_value(raw_line)
                    for tok in tokens:
                        if tok in line_map:
                            line_id = line_map[tok]
                            cursor.execute("""
                                IF NOT EXISTS (SELECT 1 FROM dbo.machine_line WHERE machine_id = ? AND line_id = ?)
                                INSERT INTO dbo.machine_line (machine_id, line_id, is_primary, is_active)
                                VALUES (?, ?, ?, ?)
                            """, (m_id, line_id, m_id, line_id, is_primary, is_active))
                
                try:
                    cursor.execute("ALTER TABLE dbo.Machine_Line_Mapping DROP CONSTRAINT FK_Machine_Line_Mapping_Machine")
                except:
                    pass
                cursor.execute("DROP TABLE dbo.Machine_Line_Mapping")
                self.sql_conn.commit()
                log.info("[MIGRATE] Legacy Machine_Line_Mapping table migrated and dropped.")
        except Exception as ex:
            log.error("Failed to migrate machine line mappings: %s", ex)

        # 6. Normalize legacy line fields in Machine_Master and Master_Data (Skipped to prevent overwriting multi-line values)
        pass

    def _migrate_sqlserver_master_data_analysis_backup(self):
        """Mocked out migration as analysis backup is removed."""
        pass

        # 4. Sync permission for admin users
        try:
            cursor.execute("""
                UPDATE dbo.Users
                SET can_master_data_analysis_backup = 1
                WHERE role = 'admin'
            """)
            self.sql_conn.commit()
        except Exception as ex:
            log.error("Failed to sync can_master_data_analysis_backup permissions: %s", ex)

        # 5. Machine_Line_Mapping Table DDL
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Machine_Line_Mapping' AND xtype='U')
                CREATE TABLE dbo.Machine_Line_Mapping (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    machine_id INT NOT NULL,
                    line NVARCHAR(100) NOT NULL,
                    is_primary INT DEFAULT 0,
                    is_active INT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_Machine_Line_Mapping_Machine FOREIGN KEY (machine_id) REFERENCES dbo.Machine_Master(id),
                    CONSTRAINT UQ_Machine_Line_Mapping UNIQUE (machine_id, line)
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created Machine_Line_Mapping table.")
        except Exception as ex:
            log.error("Failed to migrate Machine_Line_Mapping: %s", ex)

        # 6. Add needs_review column to Machine_Master
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Machine_Master' AND COLUMN_NAME='needs_review'
                )
                ALTER TABLE dbo.Machine_Master ADD needs_review INT DEFAULT 0
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'needs_review' column to Machine_Master.")
        except Exception as ex:
            log.error("Failed to add needs_review column to Machine_Master: %s", ex)

        # 7. Normalize existing multi-line machine data & flag needs_review (only run once)
        try:
            already_normalized = False
            try:
                cursor.execute("SELECT setting_value FROM dbo.App_Settings WHERE setting_key = '_machine_line_normalized'")
                row = cursor.fetchone()
                already_normalized = row is not None and row[0] == '1'
            except Exception:
                pass

            if not already_normalized:
                import re
                cursor.execute("SELECT id, line FROM dbo.Machine_Master")
                machines = cursor.fetchall()
                for m_id, line_val in machines:
                    if not line_val:
                        continue
                    parts = re.split(r'[\s/,\;\|\+&]+', line_val)
                    clean_lines = [p.strip().upper() for p in parts if p.strip()]
                    if not clean_lines:
                        continue
                    is_combined = len(clean_lines) > 1
                    primary_line = clean_lines[0]
                    needs_rev = 1 if is_combined or re.search(r'[\s/,\;\|\+&]', line_val) else 0
                    cursor.execute("""
                        UPDATE dbo.Machine_Master
                        SET line = ?, needs_review = ?
                        WHERE id = ?
                    """, (primary_line, needs_rev, m_id))
                # Mark as done
                cursor.execute("""
                    IF NOT EXISTS (SELECT 1 FROM dbo.App_Settings WHERE setting_key = '_machine_line_normalized')
                    INSERT INTO dbo.App_Settings (setting_key, setting_value) VALUES ('_machine_line_normalized', '1')
                    ELSE UPDATE dbo.App_Settings SET setting_value = '1' WHERE setting_key = '_machine_line_normalized'
                """)
                self.sql_conn.commit()
                print("[MIGRATE] Normalized Machine_Master combined lines and set needs_review flags.")
        except Exception as ex:
            log.error("Failed to normalize combined lines in Machine_Master: %s", ex)

    def _migrate_sqlserver_email_features(self):
        """Create tables and columns needed for Email features in SQL Server"""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        
        # 1. Add email column to Supplier_Offer (Skipped/Dropped column)
        pass

        # 2. Create Email_Supplier_Log table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Email_Supplier_Log' AND xtype='U')
                CREATE TABLE dbo.Email_Supplier_Log (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    master_data_id NVARCHAR(50) NULL,
                    bin NVARCHAR(100) NULL,
                    supplier_id INT NULL,
                    sent_date DATETIME DEFAULT GETDATE()
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created Email_Supplier_Log table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to create Email_Supplier_Log: {ex}")

        # 3. Create App_Settings table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='App_Settings' AND xtype='U')
                CREATE TABLE dbo.App_Settings (
                    setting_key NVARCHAR(100) PRIMARY KEY,
                    setting_value NVARCHAR(MAX) NULL,
                    updated_at DATETIME DEFAULT GETDATE()
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created App_Settings table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to create App_Settings: {ex}")

        # 4. Create Email_Draft table
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Email_Draft' AND xtype='U')
                CREATE TABLE dbo.Email_Draft (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    draft_type NVARCHAR(50) NOT NULL,
                    body_html NVARCHAR(MAX) NULL,
                    metadata NVARCHAR(MAX) NULL,
                    created_at DATETIME DEFAULT GETDATE()
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Created Email_Draft table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to create Email_Draft: {ex}")

    def _migrate_sqlserver_master_image(self):
        """Add image column to Master_Data for sparepart photos"""
        if not self.sql_conn:
            return
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='image'
                )
                ALTER TABLE dbo.Master_Data ADD image NVARCHAR(500) NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'image' column to Master_Data table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add image to Master_Data: {ex}")

    def _migrate_sqlserver_email_v2(self):
        """Upgrade email feature: rfq_selected column, email_enabled toggle, separate RFQ config"""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        # 1. Add rfq_selected (or alert_selected if already renamed) column to Master_Data
        try:
            cursor.execute("""
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='alert_selected'
            """)
            if not cursor.fetchone():
                cursor.execute("""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='rfq_selected'
                    )
                    ALTER TABLE dbo.Master_Data ADD rfq_selected BIT DEFAULT 0 NULL
                """)
                self.sql_conn.commit()
                print("[MIGRATE] Checked/Added 'rfq_selected' column to Master_Data.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add rfq_selected: {ex}")
        # 2. Migrate admin_email -> receiver_email for backward compat
        try:
            cursor.execute("SELECT setting_value FROM App_Settings WHERE setting_key = 'admin_email'")
            row = cursor.fetchone()
            if row:
                admin_val = row[0]
                cursor.execute("SELECT COUNT(*) FROM App_Settings WHERE setting_key = 'receiver_email'")
                if cursor.fetchone()[0] == 0 and admin_val:
                    cursor.execute("INSERT INTO App_Settings (setting_key, setting_value) VALUES ('receiver_email', ?)", (admin_val,))
                    self.sql_conn.commit()
        except Exception as ex:
            print(f"[MIGRATE] Failed to migrate admin_email: {ex}")

        # 3. Seed default settings for email feature
        defaults = {
            "email_enabled": "0",
            "scheduler_interval_hours": "1",
            "smtp_server_rfq": "",
            "smtp_port_rfq": "587",
            "sender_email_rfq": "",
            "sender_password_rfq": "",
            "receiver_email_rfq": "",
        }
        for k, v in defaults.items():
            try:
                cursor.execute("""
                    IF NOT EXISTS (SELECT 1 FROM App_Settings WHERE setting_key = ?)
                    INSERT INTO App_Settings (setting_key, setting_value) VALUES (?, ?)
                """, (k, k, v))
            except Exception as ex:
                print(f"[MIGRATE] Failed to seed setting {k}: {ex}")
        self.sql_conn.commit()
        print("[MIGRATE] Email v2 settings seeded.")

    def _migrate_sqlserver_alert_rename(self):
        """Rename rfq_selected -> alert_selected in Master_Data for alert/RFQ feature."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            cursor.execute("""
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='rfq_selected'
            """)
            has_old = cursor.fetchone() is not None
            cursor.execute("""
                SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME='Master_Data' AND COLUMN_NAME='alert_selected'
            """)
            has_new = cursor.fetchone() is not None

            if has_old and has_new:
                try:
                    cursor.execute("""
                        SELECT OBJECT_NAME(default_object_id)
                        FROM sys.columns
                        WHERE object_id = OBJECT_ID('dbo.Master_Data')
                        AND name = 'rfq_selected'
                    """)
                    row = cursor.fetchone()
                    if row and row[0]:
                        # ST-014 FIX 2: Validate constraint name — must be alphanumeric/underscore only
                        constraint_name = str(row[0])
                        if not re.match(r'^[A-Za-z0-9_]+$', constraint_name):
                            log.error("[ST-014] Blocked suspicious constraint name: %r", constraint_name)
                            raise ValueError(f"[ST-014] Invalid constraint name: {constraint_name!r}")
                        cursor.execute(f"ALTER TABLE dbo.Master_Data DROP CONSTRAINT [{constraint_name}]")
                except Exception:
                    pass
                cursor.execute("ALTER TABLE dbo.Master_Data DROP COLUMN rfq_selected")
                self.sql_conn.commit()
                print("[MIGRATE] Dropped duplicate rfq_selected (alert_selected already exists).")
            elif has_old and not has_new:
                cursor.execute("EXEC sp_rename 'dbo.Master_Data.rfq_selected', 'alert_selected', 'COLUMN'")
                self.sql_conn.commit()
                print("[MIGRATE] Renamed rfq_selected -> alert_selected in Master_Data.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to rename rfq_selected -> alert_selected: {ex}")

    def _migrate_sqlserver_supplier_table(self):
        """Create Supplier master table for supplier CRUD."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            cursor.execute("""
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Supplier')
                CREATE TABLE dbo.Supplier (
                    id          INT IDENTITY(1,1) PRIMARY KEY,
                    name        NVARCHAR(255) NOT NULL,
                    address     NVARCHAR(500) NULL,
                    email       NVARCHAR(255) NULL,
                    phone       NVARCHAR(50)  NULL,
                    pic         NVARCHAR(255) NULL,
                    created_at  DATETIME DEFAULT GETDATE()
                )
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Created 'Supplier' table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to create Supplier table: {ex}")

    def _migrate_sqlserver_selected_for_rfq(self):
        """Add selected_for_rfq column to Supplier_Offer (Skipped/Dropped column)."""
        pass

    def _migrate_sqlserver_supplier_offer_price_updated_at(self):
        """Add price_updated_at column to Supplier_Offer."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Supplier_Offer' AND COLUMN_NAME='price_updated_at'
                )
                ALTER TABLE dbo.Supplier_Offer ADD price_updated_at DATETIME DEFAULT GETDATE() NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Added 'price_updated_at' column to Supplier_Offer.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add price_updated_at: {ex}")

    def _migrate_sqlserver_supplier_offer_link(self):
        """Add supplier_id FK to Supplier_Offer and match existing names to Supplier table."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        # 1. Tambah kolom supplier_id jika belum ada
        try:
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Supplier_Offer' AND COLUMN_NAME='supplier_id'
                )
                ALTER TABLE dbo.Supplier_Offer ADD supplier_id INT NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Added 'supplier_id' column to Supplier_Offer.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add supplier_id: {ex}")

        # 2. Update supplier_id from Supplier table where names match
        try:
            cursor.execute("""
                UPDATE so
                SET so.supplier_id = s.id
                FROM dbo.Supplier_Offer so
                INNER JOIN dbo.Supplier s ON so.supplier_name = s.name
                WHERE so.supplier_id IS NULL
            """)
            self.sql_conn.commit()
            affected = cursor.rowcount
            if affected > 0:
                print(f"[MIGRATE] Matched {affected} Supplier_Offer rows to Supplier table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to match supplier names: {ex}")

    def _migrate_sqlserver_barang_masuk_pic(self):
        """Add pic column to Barang_Masuk for PIC assignment"""
        if not self.sql_conn:
            return
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Barang_Masuk' AND COLUMN_NAME='pic'
                )
                ALTER TABLE dbo.Barang_Masuk ADD pic NVARCHAR(100) NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'pic' column to Barang_Masuk table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add pic to Barang_Masuk: {ex}")

    def _migrate_sqlserver_barang_masuk_purchase_fields(self):
        """Add purchase details and traceability columns to Barang_Masuk"""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        new_cols = [
            ("purchase_price", "DECIMAL(18,2) NULL"),
            ("supplier",       "NVARCHAR(100) NULL"),
            ("receiving_date", "DATETIME NULL DEFAULT GETDATE()"),
            ("part_number",    "NVARCHAR(50) NULL"),
            ("user_id",        "INT NULL")
        ]
        for col, dtype in new_cols:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME='Barang_Masuk' AND COLUMN_NAME='{col}'
                    )
                    ALTER TABLE dbo.Barang_Masuk ADD {col} {dtype}
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.error("Failed to add column %s to Barang_Masuk: %s", col, ex)
        print("[MIGRATE] Checked/Added purchase details columns to Barang_Masuk table.")
        self._migrate_sqlserver_barang_masuk_schema_cleanup()

    def _migrate_sqlserver_barang_masuk_schema_cleanup(self):
        """Clean up obsolete columns and ensure constraints/columns in Barang_Masuk."""
        if not self.sql_conn:
            return
        try:
            cursor = self.sql_conn.cursor()
            cols_to_drop = [
                'bin_snapshot', 'remark', 'master_id', 
                'invoice_number', 'purchase_order', 'batch_number', 'lot_number'
            ]
            cursor.execute("""
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_BarangMasuk_MasterData')
                BEGIN
                    ALTER TABLE dbo.Barang_Masuk DROP CONSTRAINT FK_BarangMasuk_MasterData;
                END
            """)
            for col in cols_to_drop:
                cursor.execute(f"""
                    DECLARE @ConstraintName nvarchar(200)
                    SELECT @ConstraintName = Name 
                    FROM sys.default_constraints 
                    WHERE parent_object_id = OBJECT_ID('dbo.Barang_Masuk') 
                      AND parent_column_id = (
                          SELECT column_id FROM sys.columns 
                          WHERE object_id = OBJECT_ID('dbo.Barang_Masuk') AND name = '{col}'
                      )
                    IF @ConstraintName IS NOT NULL
                        EXEC('ALTER TABLE dbo.Barang_Masuk DROP CONSTRAINT ' + @ConstraintName)
                """)
            self.sql_conn.commit()
            for col in cols_to_drop:
                cursor.execute(f"""
                    IF EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME='Barang_Masuk' AND COLUMN_NAME='{col}'
                    )
                    BEGIN
                        ALTER TABLE dbo.Barang_Masuk DROP COLUMN {col};
                    END
                """)
            self.sql_conn.commit()
            print("[MIGRATE] Cleaned up obsolete columns from Barang_Masuk table.")
        except Exception as ex:
            log.error("Failed Barang_Masuk schema cleanup migration: %s", ex)
        self._migrate_sqlserver_barang_keluar_schema_cleanup()

    def _migrate_sqlserver_barang_keluar_schema_cleanup(self):
        """Clean up obsolete columns (bin_snapshot, failure_reason, action_note) from Barang_Keluar."""
        if not self.sql_conn:
            return
        try:
            cursor = self.sql_conn.cursor()
            cols_to_drop = ['bin_snapshot', 'failure_reason', 'action_note']
            for col in cols_to_drop:
                cursor.execute(f"""
                    DECLARE @ConstraintName nvarchar(200)
                    SELECT @ConstraintName = Name 
                    FROM sys.default_constraints 
                    WHERE parent_object_id = OBJECT_ID('dbo.Barang_Keluar') 
                      AND parent_column_id = (
                          SELECT column_id FROM sys.columns 
                          WHERE object_id = OBJECT_ID('dbo.Barang_Keluar') AND name = '{col}'
                      )
                    IF @ConstraintName IS NOT NULL
                        EXEC('ALTER TABLE dbo.Barang_Keluar DROP CONSTRAINT ' + @ConstraintName)
                """)
            self.sql_conn.commit()
            for col in cols_to_drop:
                cursor.execute(f"""
                    IF EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='{col}'
                    )
                    BEGIN
                        ALTER TABLE dbo.Barang_Keluar DROP COLUMN {col};
                    END
                """)
            self.sql_conn.commit()
            print("[MIGRATE] Cleaned up obsolete columns (bin_snapshot, failure_reason, action_note) from Barang_Keluar table.")
        except Exception as ex:
            log.error("Failed Barang_Keluar schema cleanup migration: %s", ex)

    def _migrate_sqlserver_barang_keluar_rem_name(self):
        """Add rem_name column to Barang_Keluar for optional remarks."""
        if not self.sql_conn:
            return
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Barang_Keluar' AND COLUMN_NAME='rem_name'
                )
                ALTER TABLE dbo.Barang_Keluar ADD rem_name NVARCHAR(MAX) NULL
            """)
            self.sql_conn.commit()
            print("[MIGRATE] Checked/Added 'rem_name' column to Barang_Keluar table.")
        except Exception as ex:
            print(f"[MIGRATE] Failed to add rem_name to Barang_Keluar: {ex}")
        self._normalize_table_names()

    def _normalize_table_names(self):
        """Standardize all database table names to clean PascalCase in SQL Server / SSMS Object Explorer."""
        if not self.sql_conn:
            return
        renames = [
            ("electrical_parts", "Electrical_Parts"),
            ("machine_line", "Machine_Line"),
            ("master_line", "Master_Line"),
            ("sparepart_line_mapping", "Sparepart_Line_Mapping"),
            ("SPAREPART_PRICE_HISTORY", "Sparepart_Price_History"),
        ]
        try:
            cursor = self.sql_conn.cursor()
            for old_name, new_name in renames:
                cursor.execute(f"""
                    IF EXISTS (
                        SELECT 1 FROM sys.tables 
                        WHERE name = '{old_name}' COLLATE Latin1_General_CS_AS
                    )
                    BEGIN
                        EXEC sp_rename 'dbo.[{old_name}]', '{new_name}';
                    END
                """)
            self.sql_conn.commit()
            print("[MIGRATE] Standardized table names to PascalCase in SQL Server Object Explorer.")
        except Exception as ex:
            log.warning("Table name normalization: %s", ex)

    def _migrate_create_sequences(self):
        """Create SEQUENCE objects if they don't exist."""
        if not self.sql_conn:
            return
        sequences = ["seq_upf_master", "seq_upf_bidding", "seq_upf_bmasuk",
                     "seq_upf_bkeluar", "seq_upf_electrical_parts"]
        cursor = self.sql_conn.cursor()
        for seq in sequences:
            try:
                cursor.execute(f"""
                    IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = '{seq}')
                    CREATE SEQUENCE dbo.[{seq}] START WITH 1 INCREMENT BY 1 CACHE 100
                """)
                self.sql_conn.commit()
            except Exception as ex:
                log.warning("Failed to create sequence %s: %s", seq, ex)

    def _seed_default_user_sql(self):
        """Seed default admin user into SQL Server dbo.Users if not exists"""
        if not self.sql_conn:
            return
        initial_admin = self.config.get('rbac', {}).get('initial_admin', {})
        admin_user = initial_admin.get('username', 'admin')
        admin_pass = initial_admin.get('password', 'admin')
        admin_role = initial_admin.get('role', 'admin')
        cursor = self.sql_conn.cursor()
        cursor.execute("SELECT id FROM dbo.Users WHERE username = ?", (admin_user,))
        if not cursor.fetchone():
            pw_hash = bcrypt.hashpw(admin_pass.encode(), bcrypt.gensalt(rounds=12)).decode()
            cursor.execute("""
                INSERT INTO dbo.Users
                    (username, password_hash, full_name, role, is_active,
                     can_master_data, can_admin_mgmt, can_bidding, can_settings,
                     can_barang_masuk, can_riwayat, can_electrical_parts,
                     can_supplier_data, can_email_settings, can_barang_keluar,
                     can_master_machine, can_sparepart_machine, can_cost_intelligence,
                     can_pareto_analysis, can_improvement_tracker, can_master_data_analysis_backup)
                VALUES (?,?,?,?,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)
            """, (admin_user, pw_hash, 'System Administrator', admin_role))
            self.sql_conn.commit()
            print("[SEED] Default admin user created in SQL Server.")

    # ==================== User/Auth Methods (SQL Server) ====================

    def validate_user(self, username: str, password: str) -> Optional[Dict]:
        """Validate user credentials from SQL Server dbo.Users"""
        if not self.sql_conn:
            print("[LOGIN] SQL Server not connected!")
            return None
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute(
                "SELECT * FROM dbo.Users WHERE username = ? AND is_active = 1", (username,))
            rows = self._sql_rows_to_dicts(cursor)
            if not rows:
                self._audit("LOGIN_FAILED", "Users", username, changed_by=username)
                return None
            user = rows[0]
            hash_val = user.get('password_hash', '')
            if bcrypt.checkpw(password.encode('utf-8'), hash_val.encode('utf-8')):
                cursor.execute(
                    "UPDATE dbo.Users SET last_login=GETDATE() WHERE id=?", (user['id'],))
                self.sql_conn.commit()
                self._audit("LOGIN_OK", "Users", username, changed_by=username)
                return {
                    'id':               user['id'],
                    'username':         user['username'],
                    'full_name':        user.get('full_name', ''),
                    'role':             user['role'],
                    'can_master_data':  user.get('can_master_data',  1),
                    'can_admin_mgmt':   user.get('can_admin_mgmt',   1),
                    'can_bidding':      user.get('can_bidding',      1),
                    'can_settings':     user.get('can_settings',     0),
                    'can_supplier_data':  user.get('can_supplier_data',  0),
                    'can_email_settings': user.get('can_email_settings', 0),
                    'can_barang_masuk':  user.get('can_barang_masuk',  1),
                    'can_riwayat':       user.get('can_riwayat',       1),
                    'can_electrical_parts': 1 if str(user.get('role','')).lower() == 'technician' else user.get('can_electrical_parts', 1),
                    'can_master_machine': user.get('can_master_machine', 0),
                    'can_sparepart_machine': user.get('can_sparepart_machine', 0),
                    'can_cost_intelligence': user.get('can_cost_intelligence', 0),
                    'can_pareto_analysis': user.get('can_pareto_analysis', 0),
                    'can_improvement_tracker': user.get('can_improvement_tracker', 0),
                    'can_master_data_analysis_backup': user.get('can_master_data_analysis_backup', 0),
                    'can_barang_keluar': user.get('can_barang_keluar', 0),
                    'can_line_mapping': user.get('can_line_mapping', 0),
                    'require_approval_keluar': user.get('require_approval_keluar', 1),
                }
            self._audit("LOGIN_FAILED", "Users", username, changed_by=username)
            return None
        except Exception as ex:
            log.warning("Login failed for user '%s': %s", username, ex)
            return None

    # ── RBAC User CRUD (SQL Server) ─────────────────────────────────────────
    def get_users(self) -> List[Dict]:
        if not self.sql_conn:
            return []
        cursor = self.sql_conn.cursor()
        cursor.execute("SELECT * FROM dbo.Users ORDER BY id")
        return self._sql_rows_to_dicts(cursor)

    def get_users_stats(self) -> Dict:
        if not self.sql_conn:
            return {"total": 0, "active": 0, "admins": 0, "has_login": 0}
        cursor = self.sql_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.Users")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dbo.Users WHERE is_active = 1")
        active = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dbo.Users WHERE role = 'admin'")
        admins = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dbo.Users WHERE last_login IS NOT NULL")
        has_login = cursor.fetchone()[0]
        return {"total": total, "active": active, "admins": admins, "has_login": has_login}

    def create_user(self, username: str, password: str, full_name: str,
                    role: str, perms: Dict) -> int:
        if not self.sql_conn:
            return 0
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
        # Admin role always bypasses approval
        require_approval = 0 if role == 'admin' else int(perms.get('require_approval_keluar', 1))
        cursor = self.sql_conn.cursor()
        cursor.execute("""
            INSERT INTO dbo.Users
                (username, password_hash, full_name, role, is_active,
                 can_master_data, can_admin_mgmt, can_bidding, can_settings,
                 can_barang_masuk, can_riwayat, can_electrical_parts,
                 can_supplier_data, can_email_settings, can_barang_keluar,
                 can_master_machine, can_sparepart_machine, can_cost_intelligence,
                 can_pareto_analysis, can_improvement_tracker, can_master_data_analysis_backup,
                 require_approval_keluar)
            VALUES (?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (username, pw_hash, full_name, role,
               perms.get('can_master_data',     0),
               perms.get('can_admin_mgmt',      0),
               perms.get('can_bidding',         0),
               perms.get('can_settings',        0),
               perms.get('can_barang_masuk',    0),
               perms.get('can_riwayat',         0),
               perms.get('can_electrical_parts', 1),
               perms.get('can_supplier_data',   0),
               perms.get('can_email_settings',  0),
               perms.get('can_barang_keluar',   0),
               perms.get('can_master_machine',  0),
               perms.get('can_sparepart_machine', 0),
               perms.get('can_cost_intelligence', 0),
               perms.get('can_pareto_analysis', 0),
               perms.get('can_improvement_tracker', 0),
               perms.get('can_master_data_analysis_backup', 0),
               require_approval))
        self.sql_conn.commit()
        cursor.execute("SELECT SCOPE_IDENTITY()")
        row = cursor.fetchone()
        return int(row[0]) if row and row[0] else 0

    def update_user(self, user_id: int, data: Dict) -> bool:
        if not self.sql_conn:
            return False
        cursor = self.sql_conn.cursor()
        
        # Check if target user is admin
        is_admin = False
        try:
            cursor.execute("SELECT username, role FROM dbo.Users WHERE id=?", (user_id,))
            u_row = cursor.fetchone()
            if u_row:
                u_name = str(u_row[0] or "").strip().lower()
                u_role = str(u_row[1] or "").strip().lower()
                if u_name == "admin" or u_role == "admin" or data.get("role") == "admin":
                    is_admin = True
        except Exception:
            pass

        if is_admin:
            data["role"] = "admin"
            perm_keys = [
                "can_master_data", "can_admin_mgmt", "can_supplier_data", "can_settings",
                "can_email_settings", "can_line_mapping", "can_barang_masuk", "can_riwayat",
                "can_electrical_parts", "can_barang_keluar", "can_master_machine",
                "can_sparepart_machine", "can_cost_intelligence"
            ]
            for k in perm_keys:
                data[k] = 1
            data["require_approval_keluar"] = 0

        if 'password' in data and data['password']:
            data['password_hash'] = bcrypt.hashpw(
                data.pop('password').encode(), bcrypt.gensalt(rounds=12)).decode()
        else:
            data.pop('password', None)
        set_clause = ", ".join([f"{k}=?" for k in data])
        cursor.execute(
            f"UPDATE dbo.Users SET {set_clause} WHERE id=?",
            list(data.values()) + [user_id])
        self.sql_conn.commit()
        return cursor.rowcount > 0

    def delete_user(self, user_id: int, changed_by: Optional[str] = None) -> bool:
        if not self.sql_conn:
            return False
        cursor = self.sql_conn.cursor()
        old_data = None
        try:
            cursor.execute("SELECT id, username, full_name, role FROM dbo.Users WHERE id=?", (user_id,))
            row = cursor.fetchone()
            if row:
                old_data = {"id": row[0], "username": row[1], "full_name": row[2], "role": row[3]}
        except Exception:
            pass
        cursor.execute(
            "DELETE FROM dbo.Users WHERE id=? AND username != 'admin'", (user_id,))
        self.sql_conn.commit()
        ok = cursor.rowcount > 0
        if ok:
            self._audit('DELETE', 'Users', str(user_id), changed_by=changed_by, old=old_data)
        return ok

    def toggle_user_active(self, user_id: int, is_active: bool) -> bool:
        if not self.sql_conn:
            return False
        cursor = self.sql_conn.cursor()
        cursor.execute(
            "UPDATE dbo.Users SET is_active=? WHERE id=? AND username != 'admin'",
            (1 if is_active else 0, user_id))
        self.sql_conn.commit()
        return cursor.rowcount > 0

    # ==================== Master Data Methods ====================
    
    def get_master_data(self, search: str = "", filters: Dict[str, str] = None, limit: int = 0, offset: int = 0, stock_status: str = None) -> List[Dict]:
        """Get master data from SQL Server with optional pagination and synced price from Admin Management (Supplier_Offer)"""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            query = """
                WITH RankedSuppliers AS (
                    SELECT 
                        master_data_id,
                        supplier_name,
                        price,
                        ROW_NUMBER() OVER(PARTITION BY master_data_id ORDER BY CASE WHEN ISNULL(is_selected, 0) = 1 THEN 0 ELSE 1 END, price ASC, id DESC) as rn
                    FROM dbo.Supplier_Offer
                    WHERE price > 0
                )
                SELECT 
                    m.*,
                    ISNULL(s.price, ISNULL(m.current_unit_price, 0)) AS current_unit_price
                FROM dbo.Master_Data m
                LEFT JOIN RankedSuppliers s ON m.id = s.master_data_id AND s.rn = 1
                WHERE (m.is_deleted = 0 OR m.is_deleted IS NULL)
            """
            params = []
            if search:
                query += (
                    " AND (m.id LIKE ? OR m.item LIKE ? OR m.detail LIKE ? OR m.brand LIKE ?"
                    " OR m.machine LIKE ? OR m.up_area LIKE ? OR m.bin LIKE ?"
                    " OR m.line LIKE ? OR m.category LIKE ?)"
                )
                term = f"%{search}%"
                params.extend([term, term, term, term, term, term, term, term, term])
            # Security: use module-level frozenset constant — cannot be tampered at runtime
            if filters:
                for key, value in filters.items():
                    if value and key in MASTER_DATA_FILTER_WHITELIST:
                        query += f" AND m.{key} = ?"  # key validated by whitelist; value parameterized
                        params.append(value)
                if filters.get("line"):
                    line_val = filters.get("line")
                    # Sanitize LIKE wildcards to prevent wildcard abuse (% _ [ chars)
                    line_val_safe = self._sanitize_like(line_val)
                    query += """ AND (
                        m.line LIKE ? 
                        OR m.id IN (
                            SELECT sparepart_id FROM dbo.sparepart_line_mapping lm
                            JOIN dbo.master_line ml ON lm.line_id = ml.id
                            WHERE ml.line_code = ? AND lm.is_active = 1 AND lm.approved = 1
                        )
                    )"""
                    params.extend([f"%{line_val_safe}%", line_val])
            # Stock status filter
            if stock_status == "Below":
                query += " AND ISNULL(m.current_stock,0) < ISNULL(m.safety_stock,0)"
            elif stock_status == "Near":
                query += " AND ISNULL(m.current_stock,0) >= ISNULL(m.safety_stock,0) AND ISNULL(m.current_stock,0) <= (ISNULL(m.safety_stock,0) * 1.2) AND ISNULL(m.safety_stock,0) > 0"
            elif stock_status == "Normal":
                query += " AND (ISNULL(m.current_stock,0) > (ISNULL(m.safety_stock,0) * 1.2) OR (ISNULL(m.safety_stock,0) = 0 AND ISNULL(m.current_stock,0) >= 0))"
            query += " ORDER BY m.bin ASC"
            if limit > 0:
                query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                params.extend([offset, limit])
            
            cursor.execute(query, params)
            rows = self._sql_rows_to_dicts(cursor)
            for r in rows:
                r['unit_price'] = r.get('current_unit_price', 0)
            return rows

    def get_master_data_fast_picker(self, search: str = "", limit: int = 35) -> list:
        """Lightweight fast query for sparepart auto-complete pickers (executes in ~1ms)."""
        if not self.sql_conn: return []
        safe_limit = max(1, min(int(limit) * 2, 200))
        with self.sql_conn.cursor() as cursor:
            query = f"""
                SELECT TOP {safe_limit} id, bin, item, detail, line, 
                       ISNULL(budget_code, '') as budget_code,
                       ISNULL(qty_need_year, 0) as qty_need_year,
                       ISNULL(safety_stock, 0) as safety_stock,
                       ISNULL(current_stock, 0) as current_stock,
                       ISNULL(current_unit_price, 0) as current_unit_price,
                       ISNULL(brand, '') as brand,
                       ISNULL(is_deleted, 0) as is_deleted
                FROM dbo.Master_Data
            """
            params = []
            if search:
                query += " WHERE (id LIKE ? OR item LIKE ? OR bin LIKE ? OR detail LIKE ?)"
                t = f"%{search}%"
                params.extend([t, t, t, t])
            query += " ORDER BY bin ASC"
            cursor.execute(query, params)
            rows = self._sql_rows_to_dicts(cursor)
            return [r for r in rows if int(r.get("is_deleted") or 0) != 1][:limit]

    def count_master_data(self, search: str = "", filters: Dict[str, str] = None, stock_status: str = None) -> int:
        """Count total master data records in SQL Server"""
        if not self.sql_conn: return 0
        # Use alias `m` for consistency with get_master_data() — prevents ambiguous column on future JOINs
        query = "SELECT COUNT(*) FROM dbo.Master_Data m WHERE (m.is_deleted = 0 OR m.is_deleted IS NULL)"
        params = []
        if search:
            query += (
                " AND (m.id LIKE ? OR m.item LIKE ? OR m.detail LIKE ? OR m.brand LIKE ?"
                " OR m.machine LIKE ? OR m.up_area LIKE ? OR m.bin LIKE ?"
                " OR m.line LIKE ? OR m.category LIKE ?)"
            )
            term = f"%{search}%"
            params.extend([term, term, term, term, term, term, term, term, term])
        # Security: use module-level frozenset constant — cannot be tampered at runtime
        if filters:
            for key, value in filters.items():
                if value and key in MASTER_DATA_FILTER_WHITELIST:
                    query += f" AND m.{key} = ?"  # key validated by whitelist; value parameterized
                    params.append(value)
            if filters.get("line"):
                line_val = filters.get("line")
                # Sanitize LIKE wildcards to prevent wildcard abuse (% _ [ chars)
                line_val_safe = self._sanitize_like(line_val)
                query += """ AND (
                    m.line LIKE ? 
                    OR m.id IN (
                        SELECT sparepart_id FROM dbo.sparepart_line_mapping lm
                        JOIN dbo.master_line ml ON lm.line_id = ml.id
                        WHERE ml.line_code = ? AND lm.is_active = 1 AND lm.approved = 1
                    )
                )"""
                params.extend([f"%{line_val_safe}%", line_val])
        # Stock status filter
        if stock_status == "Below":
            query += " AND ISNULL(current_stock,0) < ISNULL(safety_stock,0)"
        elif stock_status == "Near":
            query += " AND ISNULL(current_stock,0) >= ISNULL(safety_stock,0) AND ISNULL(current_stock,0) <= (ISNULL(safety_stock,0) * 1.2) AND ISNULL(safety_stock,0) > 0"
        elif stock_status == "Normal":
            query += " AND (ISNULL(current_stock,0) > (ISNULL(safety_stock,0) * 1.2) OR (ISNULL(safety_stock,0) = 0 AND ISNULL(current_stock,0) >= 0))"
        cursor = self.sql_conn.cursor()
        cursor.execute(query, params)
        res = cursor.fetchone()
        return res[0] if res else 0

    def toggle_alert_selection(self, item_id: str, selected: bool) -> bool:
        """Toggle alert_selected status for a Master_Data item in SQL Server."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            val = 1 if selected else 0
            cur.execute("UPDATE dbo.Master_Data SET alert_selected = ? WHERE id = ?", (val, str(item_id)))
            self._commit()
            return True
        except Exception as ex:
            log.error("toggle_alert_selection failed for id=%s: %s", item_id, ex)
            return False

    def get_duplicate_bins(self) -> set:
        """Return a set of bin codes that appear more than once in Master_Data."""
        if not self.sql_conn:
            return set()
        cur = self._cursor()
        try:
            cur.execute("""
                SELECT bin FROM dbo.Master_Data
                WHERE (is_deleted = 0 OR is_deleted IS NULL) AND bin IS NOT NULL AND bin <> ''
                GROUP BY bin
                HAVING COUNT(*) > 1
            """)
            return {row[0].strip().upper() for row in cur.fetchall() if row[0]}
        except Exception as ex:
            log.error("get_duplicate_bins failed: %s", ex)
            return set()

    def get_setting(self, setting_key: str, default_val: str = "") -> str:
        """Get key-value setting from dbo.App_Settings."""
        if not self.sql_conn:
            return default_val
        try:
            cur = self._cursor()
            cur.execute("SELECT setting_value FROM dbo.App_Settings WHERE setting_key = ?", (setting_key,))
            row = cur.fetchone()
            if row and row[0] is not None:
                return str(row[0])
            return default_val
        except Exception as ex:
            log.error("get_setting failed for %s: %s", setting_key, ex)
            return default_val

    def set_setting(self, setting_key: str, setting_value: str) -> bool:
        """Upsert key-value setting in dbo.App_Settings."""
        if not self.sql_conn:
            return False
        try:
            cur = self._cursor()
            cur.execute("""
                IF EXISTS (SELECT 1 FROM dbo.App_Settings WHERE setting_key = ?)
                    UPDATE dbo.App_Settings SET setting_value = ?, updated_at = GETDATE() WHERE setting_key = ?
                ELSE
                    INSERT INTO dbo.App_Settings (setting_key, setting_value, created_at, updated_at) VALUES (?, ?, GETDATE(), GETDATE())
            """, (setting_key, setting_value, setting_key, setting_key, setting_value))
            self._commit()
            return True
        except Exception as ex:
            log.error("set_setting failed for %s: %s", setting_key, ex)
            return False



    def get_master_data_by_id(self, id) -> Optional[Dict]:
        """Get single master data record by ID (UPF-xxxx) from SQL Server"""
        if not self.sql_conn: return None
        cursor = self.sql_conn.cursor()
        cursor.execute("SELECT * FROM Master_Data WHERE id = ?", (str(id),))
        rows = self._sql_rows_to_dicts(cursor)
        if rows:
            row = rows[0]
            row['unit_price'] = row.get('current_unit_price')
            return row
        return None

    def create_master_data(self, data: Dict, changed_by: str = None) -> str:
        """Create new master data record in SQL Server with UPF- prefixed id."""
        if not self.sql_conn: return ""
        cursor = self.sql_conn.cursor()
        
        user_name = changed_by or data.pop("changed_by", None)
        if not data.get("currency"):
            data["currency"] = "IDR"

        # Extract lines mapping if provided
        lines_input = data.pop("lines", None)
        if lines_input is not None:
            if isinstance(lines_input, str):
                line_list = [x.strip() for x in lines_input.split(",") if x.strip()]
            else:
                line_list = [str(x).strip() for x in lines_input if str(x).strip()]
            data['line'] = ", ".join(sorted(line_list))
        else:
            line_list = None
        
        # Generate new UPF- id: get max numeric part and increment
        cursor.execute("""
            SELECT ISNULL(MAX(CAST(SUBSTRING(CAST(id AS VARCHAR(50)), 5, LEN(CAST(id AS VARCHAR(50)))) AS INT)), 0)
            FROM Master_Data
            WHERE id LIKE 'UPF-%' AND ISNUMERIC(SUBSTRING(CAST(id AS VARCHAR(50)), 5, LEN(CAST(id AS VARCHAR(50))))) = 1
        """)
        last_num = cursor.fetchone()[0] or 0
        new_id = f"UPF-{last_num + 1}"
        data['id'] = new_id
        if 'unit_price' in data:
            val = data.pop('unit_price')
            if val not in (None, ""):
                try:
                    data['current_unit_price'] = float(val)
                except:
                    pass

        now_str = self._now_str()
        data['created_at'] = now_str
        data['updated_at'] = now_str

        if data.get('current_unit_price') is not None:
            data['last_price_update'] = now_str

        if user_name:
            data['last_updated_by'] = user_name

        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        cursor.execute(f"INSERT INTO Master_Data ({columns}) VALUES ({placeholders})", list(data.values()))
        
        # Handle lines mapping insert for new sparepart
        if line_list:
            for line_code in line_list:
                cursor.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
                ml_row = cursor.fetchone()
                if ml_row:
                    line_id = ml_row[0]
                    cursor.execute("""
                        INSERT INTO dbo.sparepart_line_mapping (sparepart_id, line_id, approved, is_active, mapping_source, created_at)
                        VALUES (?, ?, 1, 1, 'MANUAL', GETDATE())
                    """, (new_id, line_id))
                    
        self.sql_conn.commit()
        self._audit('INSERT', 'Master_Data', new_id, changed_by=user_name, new=data)
        return new_id

    def update_master_data(self, id, data: Dict, changed_by: str = None) -> bool:
        """Update master data record in SQL Server (id is UPF-xxxx string)"""
        if not self.sql_conn: return False
        cursor = self.sql_conn.cursor()
        
        user_name = changed_by or data.pop("changed_by", None)
        if "currency" in data and not data["currency"]:
            data["currency"] = "IDR"

        # Fetch old record data for audit log tracking
        old_data = None
        try:
            cursor.execute("SELECT TOP 1 * FROM dbo.Master_Data WHERE id = ?", (str(id),))
            old_row = cursor.fetchone()
            if old_row and cursor.description:
                cols = [col[0] for col in cursor.description]
                old_data = dict(zip(cols, old_row))
        except Exception as ex:
            log.warning("Failed to fetch old_data for audit: %s", ex)

        # Extract lines mapping if provided
        lines_input = data.pop("lines", None)
        if lines_input is not None:
            if isinstance(lines_input, str):
                line_list = [x.strip() for x in lines_input.split(",") if x.strip()]
            else:
                line_list = [str(x).strip() for x in lines_input if str(x).strip()]
            data['line'] = ", ".join(sorted(line_list))
        else:
            line_list = None
        
        price_val = None
        if 'unit_price' in data:
            val = data.pop('unit_price')
            if val not in (None, ""):
                try:
                    price_val = float(val)
                    data['current_unit_price'] = price_val
                except:
                    pass
        elif 'current_unit_price' in data:
            val = data.get('current_unit_price')
            if val not in (None, ""):
                try:
                    price_val = float(val)
                    data['current_unit_price'] = price_val
                except:
                    pass

        now_str = self._now_str()
        data['updated_at'] = now_str

        if price_val is not None:
            cursor.execute("SELECT current_unit_price FROM Master_Data WHERE id = ?", (str(id),))
            old_row = cursor.fetchone()
            old_p = float(old_row[0]) if (old_row and old_row[0] is not None) else None
            if old_p is None or abs(price_val - old_p) > 0.001:
                data['last_price_update'] = now_str

        if user_name:
            data['last_updated_by'] = user_name

        set_clause = ', '.join([f"{key} = ?" for key in data.keys()])
        params = list(data.values()) + [str(id)]
        cursor.execute(f"UPDATE Master_Data SET {set_clause} WHERE id = ?", params)
        
        # Handle lines mapping update
        if line_list is not None:
            # Deactivate existing mappings
            cursor.execute("UPDATE dbo.sparepart_line_mapping SET is_active = 0, updated_at = GETDATE() WHERE sparepart_id = ?", (str(id),))
            
            for line_code in line_list:
                cursor.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
                ml_row = cursor.fetchone()
                if ml_row:
                    line_id = ml_row[0]
                    cursor.execute("SELECT id FROM dbo.sparepart_line_mapping WHERE sparepart_id = ? AND line_id = ?", (str(id), line_id))
                    mapping_row = cursor.fetchone()
                    if mapping_row:
                        cursor.execute("""
                            UPDATE dbo.sparepart_line_mapping 
                            SET is_active = 1, approved = 1, updated_at = GETDATE(), mapping_source = 'MANUAL'
                            WHERE sparepart_id = ? AND line_id = ?
                        """, (str(id), line_id))
                    else:
                        cursor.execute("""
                            INSERT INTO dbo.sparepart_line_mapping (sparepart_id, line_id, approved, is_active, mapping_source, created_at)
                            VALUES (?, ?, 1, 1, 'MANUAL', GETDATE())
                        """, (str(id), line_id))
                        
        self.sql_conn.commit()
        self._audit('UPDATE', 'Master_Data', str(id), changed_by=user_name, old=old_data, new=data)
        return True

    def delete_master_data(self, id, changed_by: Optional[str] = None) -> bool:
        """Soft delete master data record in SQL Server (sets is_deleted = 1, deleted_at = GETDATE()). Keeps row in DB for 3 months."""
        if not self.sql_conn: return False
        sp_id = str(id)
        cursor = self.sql_conn.cursor()
        old_data = None
        try:
            cursor.execute("SELECT TOP 1 id, item, bin, line, up_area, category FROM dbo.Master_Data WHERE id = ?", (sp_id,))
            row = cursor.fetchone()
            if row:
                old_data = {"id": row[0], "item": row[1], "bin": row[2], "line": row[3], "up_area": row[4], "category": row[5]}
        except Exception:
            pass

        try:
            # Soft delete: update is_deleted = 1 and deleted_at = GETDATE()
            cursor.execute(
                "UPDATE dbo.Master_Data SET is_deleted = 1, deleted_at = GETDATE(), updated_at = GETDATE() WHERE id = ?",
                (sp_id,)
            )
            self.sql_conn.commit()
            self._audit('DELETE', 'Master_Data', sp_id, changed_by=changed_by, old=old_data)
            return True
        except Exception as ex:
            self.sql_conn.rollback()
            import logging
            logging.getLogger("UPMS.DB").error("delete_master_data error: %s", ex)
            raise ex

    def purge_soft_deleted_master_data(self):
        """Hard delete soft-deleted records from dbo.Master_Data that have been soft-deleted for more than 3 months (90 days)."""
        if not self.sql_conn: return
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("""
                SELECT id FROM dbo.Master_Data 
                WHERE is_deleted = 1 AND deleted_at IS NOT NULL AND deleted_at < DATEADD(month, -3, GETDATE())
            """)
            old_ids = [str(r[0]) for r in cursor.fetchall()]
            for sp_id in old_ids:
                try:
                    cursor.execute("DELETE FROM dbo.sparepart_line_mapping WHERE sparepart_id = ?", (sp_id,))
                except Exception:
                    pass
                try:
                    cursor.execute("DELETE FROM dbo.Supplier_Offer WHERE master_data_id = ?", (sp_id,))
                except Exception:
                    pass
                try:
                    cursor.execute("DELETE FROM dbo.Sparepart_Machine_Usage WHERE master_data_id = ? OR sparepart_id = ?", (sp_id, sp_id))
                except Exception:
                    pass
                try:
                    cursor.execute("DELETE FROM dbo.SPAREPART_PRICE_HISTORY WHERE master_data_id = ? OR sparepart_id = ?", (sp_id, sp_id))
                except Exception:
                    pass
                cursor.execute("DELETE FROM dbo.Master_Data WHERE id = ?", (sp_id,))
                self._audit('PURGE_HARD_DELETE', 'Master_Data', sp_id, changed_by='System_Auto_Purge')
            self.sql_conn.commit()
            if old_ids:
                import logging
                logging.getLogger("UPMS.DB").info("Purged %d soft-deleted master data items older than 3 months.", len(old_ids))
        except Exception as ex:
            import logging
            logging.getLogger("UPMS.DB").warning("purge_soft_deleted_master_data error: %s", ex)

    def update_master_data_stock(self, bin_code: str, qty: float) -> bool:
        """Reduce current_stock based on BIN code (Barang Keluar) in SQL Server"""
        if not self.sql_conn: return False
        cursor = self.sql_conn.cursor()
        cursor.execute(
            "UPDATE Master_Data SET current_stock = current_stock - ?, updated_at = ? WHERE bin = ?",
            (qty, self._now_str(), bin_code)
        )
        self.sql_conn.commit()
        self._audit('STOCK_DEDUCT', 'Master_Data', bin_code, new={'deducted_qty': qty, 'bin': bin_code})
        return cursor.rowcount > 0

    def increase_master_data_stock(self, bin_code: str, qty: float) -> bool:
        """Increase current_stock based on BIN code (Barang Masuk) in SQL Server"""
        if not self.sql_conn: return False
        cursor = self.sql_conn.cursor()
        cursor.execute(
            "UPDATE Master_Data SET current_stock = current_stock + ?, updated_at = ? WHERE bin = ?",
            (qty, self._now_str(), bin_code)
        )
        self.sql_conn.commit()
        self._audit('STOCK_ADD', 'Master_Data', bin_code, new={'added_qty': qty, 'bin': bin_code})
        return cursor.rowcount > 0

    def get_item_name_by_bin(self, bin_code: str) -> Optional[str]:
        """Get item name from Master_Data by BIN code (for auto-fill)"""
        if not self.sql_conn: return None
        cursor = self.sql_conn.cursor()
        cursor.execute("SELECT TOP 1 item FROM Master_Data WHERE bin = ?", (bin_code,))
        row = cursor.fetchone()
        return row[0] if row else None

    # Explicit UP Area Directive Mapping Rule
    UP2_LINE_CODES: frozenset = frozenset({
        'S20', 'S19', 'S18', 'S16', 'S15', 'S14', 'S10', 'S9', 'S8', 'S7', 'S6',
        'B20', 'B21', 'B22', 'B19', 'B18', 'B17', 'B11', 'B24'
    })

    # ST-014 FIX 3: Whitelist of allowed column names for dynamic SELECT DISTINCT queries
    _ALLOWED_FILTER_COLUMNS: frozenset = frozenset({'up_area', 'category', 'line', 'frequency'})

    def _migrate_up_area_line_mapping(self):
        """Migrate and enforce explicit UP1 / UP2 area mapping directive across database tables."""
        if not self.sql_conn:
            return
        cursor = self.sql_conn.cursor()
        try:
            placeholders = ','.join("'%s'" % c for c in self.UP2_LINE_CODES)
            # 1. Update master_line table
            cursor.execute(f"UPDATE dbo.master_line SET area = 'UP2' WHERE line_code IN ({placeholders})")
            cursor.execute(f"UPDATE dbo.master_line SET area = 'UP1' WHERE line_code NOT IN ({placeholders})")
            self.sql_conn.commit()

            # 2. Update Master_Data single-line records
            cursor.execute(f"UPDATE dbo.Master_Data SET up_area = 'UP2' WHERE UPPER(RTRIM(LTRIM(line))) IN ({placeholders})")
            cursor.execute(f"UPDATE dbo.Master_Data SET up_area = 'UP1' WHERE UPPER(RTRIM(LTRIM(line))) NOT IN ({placeholders}) AND line IS NOT NULL AND line != '' AND CHARINDEX(',', line) = 0")
            
            self.sql_conn.commit()
            log.info("[MIGRATE] Enforced explicit UP1 / UP2 line area mapping directive.")
        except Exception as ex:
            log.error("Failed in _migrate_up_area_line_mapping: %s", ex)

    def get_master_data_filters(self, up_area: str = None) -> Dict[str, List[str]]:
        """Get distinct values for filter dropdowns from SQL Server, filtered strictly by up_area directives."""
        if not self.sql_conn: return {'up_area': [], 'category': [], 'line': [], 'frequency': []}
        cursor = self.sql_conn.cursor()
        filters = {}

        # Normalize target area (UP1 / UP2)
        target_area = None
        if up_area and str(up_area).strip().lower() != "all":
            clean_area = str(up_area).strip().upper().replace(" ", "")
            if "UP2" in clean_area:
                target_area = "UP2"
            elif "UP1" in clean_area:
                target_area = "UP1"
            else:
                target_area = str(up_area).strip()

        for column in self._ALLOWED_FILTER_COLUMNS:
            if column not in self._ALLOWED_FILTER_COLUMNS:
                continue
            if target_area and column != 'up_area':
                cursor.execute(f"""
                    SELECT DISTINCT {column} FROM dbo.Master_Data 
                    WHERE (up_area = ? OR REPLACE(up_area, ' ', '') = ?) 
                      AND {column} IS NOT NULL AND {column} != ''
                """, (up_area, target_area))
            else:
                cursor.execute(f"SELECT DISTINCT {column} FROM dbo.Master_Data WHERE {column} IS NOT NULL AND {column} != ''")
            filters[column] = [row[0] for row in cursor.fetchall()]

        # Process lines strictly matching the explicit UP1 / UP2 directive rule
        try:
            cursor.execute("SELECT DISTINCT line FROM dbo.Master_Data WHERE line IS NOT NULL AND line != ''")
            raw_lines = [r[0] for r in cursor.fetchall() if r[0]]
            cursor.execute("SELECT DISTINCT line_code FROM dbo.master_line WHERE status = 'active'")
            ml_lines = [r[0] for r in cursor.fetchall() if r[0]]

            all_line_tokens = set()
            for rl in raw_lines + ml_lines:
                for tok in rl.split(','):
                    t = tok.strip().upper()
                    if t:
                        all_line_tokens.add(t)

            if target_area == "UP2":
                filtered_lines = [l for l in all_line_tokens if l in self.UP2_LINE_CODES]
            elif target_area == "UP1":
                filtered_lines = [l for l in all_line_tokens if l not in self.UP2_LINE_CODES]
            else:
                filtered_lines = list(all_line_tokens)

            filters['line'] = sorted(filtered_lines)
            filters['up_area'] = ['UP1', 'UP2']
        except Exception as ex:
            log.warning("Failed in get_master_data_filters: %s", ex)

        return filters
    
    # ==================== Admin Management Methods ====================
    
    def get_admin_management(self, search: str = "", filters: Dict[str, str] = None, limit: int = 0, offset: int = 0, stock_status: str = None) -> List[Dict]:
        """Get procurement comparison by joining Master_Data and Supplier_Offer"""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            # Query ini mengambil data dari Master Data dan menyambungkannya dengan Supplier Termurah
            # total_value dihitung secara dinamis: price * qty_need_year
            query = """
                WITH RankedSuppliers AS (
                    SELECT 
                        master_data_id,
                        supplier_name,
                        price,
                        ROW_NUMBER() OVER(PARTITION BY master_data_id ORDER BY CASE WHEN ISNULL(is_selected, 0) = 1 THEN 0 ELSE 1 END, price ASC, id DESC) as rn,
                        COUNT(*) OVER(PARTITION BY master_data_id) as sup_count
                    FROM Supplier_Offer
                    WHERE price > 0
                ),
                BiddingCheck AS (
                    SELECT DISTINCT master_data_id
                    FROM Bidding_History
                    WHERE master_data_id IS NOT NULL AND master_data_id != ''
                )
                SELECT 
                    m.id as master_id,
                    m.up_area,
                    m.bin,
                    m.item as nama_item,
                    m.detail,
                    m.bin as code_item, -- Menggunakan BIN sebagai Item Code
                    m.current_stock,
                    m.safety_stock,
                    ISNULL(s.supplier_name, '-') as supplier,
                    ISNULL(s.price, ISNULL(m.current_unit_price, 0)) as price,
                    ISNULL(ISNULL(s.price, m.current_unit_price), 0) * ISNULL(m.current_stock, 0) as total_value,
                    CASE 
                        WHEN bh.master_data_id IS NOT NULL THEN 'YES' 
                        ELSE 'NO' 
                    END as bidding,
                    ISNULL(s.sup_count, 0) as supplier_count
                FROM Master_Data m
                LEFT JOIN RankedSuppliers s ON m.id = s.master_data_id AND s.rn = 1
                LEFT JOIN BiddingCheck bh ON m.id = bh.master_data_id
                WHERE 1=1
            """
            params = []
            
            if search:
                query += " AND (m.id LIKE ? OR m.item LIKE ? OR m.bin LIKE ? OR s.supplier_name LIKE ?)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term, search_term])

            if stock_status == "Below":
                query += " AND ISNULL(m.current_stock, 0) < ISNULL(m.safety_stock, 0)"
            elif stock_status == "Near":
                query += " AND ISNULL(m.current_stock, 0) >= ISNULL(m.safety_stock, 0) AND ISNULL(m.current_stock, 0) <= (ISNULL(m.safety_stock, 0) * 1.2) AND ISNULL(m.safety_stock, 0) > 0"
            elif stock_status == "Normal":
                query += " AND (ISNULL(m.current_stock, 0) > (ISNULL(m.safety_stock, 0) * 1.2) OR (ISNULL(m.safety_stock, 0) = 0 AND ISNULL(m.current_stock, 0) >= 0))"
            
            query += " ORDER BY m.bin ASC"
            
            if limit > 0:
                query += " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                params.extend([offset, limit])
                
            cursor.execute(query, params)
            return self._sql_rows_to_dicts(cursor)

    def count_admin_management(self, search: str = "", stock_status: str = None) -> int:
        """Count total records for admin management from SQL Server"""
        if not self.sql_conn: return 0
        with self.sql_conn.cursor() as cursor:
            query = """
                WITH RankedSuppliers AS (
                    SELECT master_data_id, supplier_name, price, ROW_NUMBER() OVER(PARTITION BY master_data_id ORDER BY price ASC, id DESC) as rn
                    FROM Supplier_Offer
                    WHERE price > 0
                )
                SELECT COUNT(*) 
                FROM Master_Data m
                LEFT JOIN RankedSuppliers s ON m.id = s.master_data_id AND s.rn = 1
                WHERE 1=1
            """
            params = []
            if search:
                query += " AND (m.id LIKE ? OR m.item LIKE ? OR m.bin LIKE ? OR s.supplier_name LIKE ?)"
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term, search_term])
                
            if stock_status == "Below":
                query += " AND ISNULL(m.current_stock, 0) < ISNULL(m.safety_stock, 0)"
            elif stock_status == "Near":
                query += " AND ISNULL(m.current_stock, 0) >= ISNULL(m.safety_stock, 0) AND ISNULL(m.current_stock, 0) <= (ISNULL(m.safety_stock, 0) * 1.2) AND ISNULL(m.safety_stock, 0) > 0"
            elif stock_status == "Normal":
                query += " AND (ISNULL(m.current_stock, 0) > (ISNULL(m.safety_stock, 0) * 1.2) OR (ISNULL(m.safety_stock, 0) = 0 AND ISNULL(m.current_stock, 0) >= 0))"

            cursor.execute(query, params)
            res = cursor.fetchone()
            return res[0] if res else 0

    def get_admin_stats(self) -> Dict[str, int]:
        """Get summary stats for admin management"""
        if not self.sql_conn: return {"below":0, "near":0, "normal":0, "total":0}
        with self.sql_conn.cursor() as cursor:
            stats = {"below": 0, "near": 0, "normal": 0, "total": 0}
            
            cursor.execute("SELECT COUNT(*) FROM Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL)")
            res = cursor.fetchone()
            stats["total"] = res[0] if res else 0
            
            cursor.execute("SELECT COUNT(*) FROM Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ISNULL(current_stock, 0) < ISNULL(safety_stock, 0)")
            res = cursor.fetchone()
            stats["below"] = res[0] if res else 0
            
            cursor.execute("SELECT COUNT(*) FROM Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ISNULL(current_stock, 0) >= ISNULL(safety_stock, 0) AND ISNULL(current_stock, 0) <= (ISNULL(safety_stock, 0) * 1.2) AND ISNULL(safety_stock, 0) > 0")
            res = cursor.fetchone()
            stats["near"] = res[0] if res else 0
            
            cursor.execute("SELECT COUNT(*) FROM Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (ISNULL(current_stock, 0) > (ISNULL(safety_stock, 0) * 1.2) OR (ISNULL(safety_stock, 0) = 0 AND ISNULL(current_stock, 0) >= 0))")
            res = cursor.fetchone()
            stats["normal"] = res[0] if res else 0
            
            return stats

    def get_items_for_auto_alert(self) -> List[Dict]:
        """
        Get items that need auto-alert email based on frequency cooldown:
        - FAST: 14 days cooldown
        - SLOW/NULL: 30 days cooldown
        Only items with current_stock <= safety_stock AND alert_selected = 1
        """
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            query = """
                SELECT m.id, m.bin, m.item, m.detail, m.frequency, m.current_stock, m.safety_stock, m.brand, m.machine, m.line,
                       l.last_sent
                FROM Master_Data m
                LEFT JOIN (
                    SELECT master_data_id, MAX(sent_date) as last_sent
                    FROM Email_Supplier_Log
                    GROUP BY master_data_id
                ) l ON m.id = l.master_data_id
                WHERE m.current_stock <= ISNULL(m.safety_stock, 0)
                AND ISNULL(m.alert_selected, 0) = 1
                AND (
                    (UPPER(ISNULL(m.frequency, 'SLOW')) = 'FAST' AND (l.last_sent IS NULL OR DATEDIFF(day, l.last_sent, GETDATE()) >= 14))
                    OR 
                    (UPPER(ISNULL(m.frequency, 'SLOW')) = 'SLOW' AND (l.last_sent IS NULL OR DATEDIFF(day, l.last_sent, GETDATE()) >= 30))
                )
            """
            cursor.execute(query)
            return self._sql_rows_to_dicts(cursor)

    def log_email_sent(self, master_id, bin_code: str):
        """Log that an alert email was sent for a specific item to enforce cooldown."""
        if not self.sql_conn: return
        with self.sql_conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO Email_Supplier_Log (master_data_id, bin, sent_date) VALUES (?, ?, GETDATE())",
                (str(master_id), bin_code)
            )
            self.sql_conn.commit()

    def save_draft(self, draft_type: str, body_html: str, metadata: str = "{}"):
        """Save an email draft to Email_Draft table."""
        if not self.sql_conn:
            return None
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO dbo.Email_Draft (draft_type, body_html, metadata) VALUES (?, ?, ?)",
                    (draft_type, body_html, metadata)
                )
                self.sql_conn.commit()
                return cursor.execute("SELECT SCOPE_IDENTITY()").fetchone()[0]
        except Exception as ex:
            print(f"[DRAFT] Failed to save draft: {ex}")
            return None

    def get_recent_drafts(self, limit: int = 5):
        """Get recent email drafts, newest first."""
        if not self.sql_conn:
            return []
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT TOP(?) id, draft_type, metadata, created_at
                    FROM dbo.Email_Draft
                    ORDER BY created_at DESC
                """, (limit,))
                return self._sql_rows_to_dicts(cursor)
        except Exception as ex:
            print(f"[DRAFT] Failed to get drafts: {ex}")
            return []

    def get_alert_selected_items(self) -> List[Dict]:
        """Get items where alert_selected = 1 (selected for auto-RFQ alert)."""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            cursor.execute("""
                SELECT m.id, m.bin, m.item, m.detail, m.brand, m.machine, m.line,
                       m.qty_need_year, m.current_stock, m.safety_stock, m.frequency
                FROM Master_Data m
                WHERE ISNULL(m.alert_selected, 0) = 1
                ORDER BY m.bin ASC
            """)
            return self._sql_rows_to_dicts(cursor)

    def toggle_alert_selection(self, item_id: str, selected: bool = True) -> bool:
        """Set alert_selected flag for a single item (immediate save)."""
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            val = 1 if selected else 0
            cursor.execute(
                "UPDATE Master_Data SET alert_selected = ? WHERE id = ?",
                (val, str(item_id))
            )
            self.sql_conn.commit()
            return cursor.rowcount > 0


    # ==================== Supplier Master CRUD ====================

    def get_all_suppliers(self, search: str = "", limit: int = 0, offset: int = 0) -> List[Dict]:
        """Get all suppliers from Supplier table with optional search & pagination."""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            if search:
                like = f"%{search}%"
                if limit > 0:
                    cursor.execute("""
                        SELECT *, COUNT(*) OVER() as _total
                        FROM dbo.Supplier
                        WHERE name LIKE ? OR email LIKE ?
                        ORDER BY name ASC
                        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                    """, (like, like, offset, limit))
                else:
                    cursor.execute("""
                        SELECT *, COUNT(*) OVER() as _total
                        FROM dbo.Supplier
                        WHERE name LIKE ? OR email LIKE ?
                        ORDER BY name ASC
                    """, (like, like))
            else:
                if limit > 0:
                    cursor.execute("""
                        SELECT *, COUNT(*) OVER() as _total
                        FROM dbo.Supplier
                        ORDER BY name ASC
                        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                    """, (offset, limit))
                else:
                    cursor.execute("SELECT *, COUNT(*) OVER() as _total FROM dbo.Supplier ORDER BY name ASC")
            rows = self._sql_rows_to_dicts(cursor)
            return rows

    def get_supplier_by_id(self, supplier_id: int) -> Optional[Dict]:
        """Get a single supplier by ID."""
        if not self.sql_conn: return None
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT * FROM dbo.Supplier WHERE id = ?", (supplier_id,))
            rows = self._sql_rows_to_dicts(cursor)
            return rows[0] if rows else None

    def create_supplier(self, name: str, address: str = "", email: str = "", phone: str = "", pic: str = "") -> int:
        """Create a new supplier. Returns new ID."""
        if not self.sql_conn: return 0
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO dbo.Supplier (name, address, email, phone, pic)
                    OUTPUT INSERTED.id
                    VALUES (?, ?, ?, ?, ?)
                """, (name, address or None, email or None, phone or None, pic or None))
                res = cursor.fetchone()
                new_id = int(res[0]) if res and res[0] is not None else 0
                self.sql_conn.commit()
                return new_id
        except Exception as ex:
            print(f"[ERROR] create_supplier failed: {ex}")
            if self.sql_conn:
                try:
                    self.sql_conn.rollback()
                except Exception:
                    pass
            return 0

    def update_supplier(self, supplier_id: int, name: str, address: str = "", email: str = "", phone: str = "", pic: str = "") -> bool:
        """Update an existing supplier."""
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            cursor.execute("""
                UPDATE dbo.Supplier SET name=?, address=?, email=?, phone=?, pic=?
                WHERE id=?
            """, (name, address or None, email or None, phone or None, pic or None, supplier_id))
            self.sql_conn.commit()
            return cursor.rowcount > 0

    def delete_supplier(self, supplier_id: int, changed_by: str = None) -> tuple:
        """Delete a supplier by ID. Returns (success, message)."""
        if not self.sql_conn: return (False, "Database not connected")
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT name FROM dbo.Supplier WHERE id = ?", (supplier_id,))
            row = cursor.fetchone()
            if not row:
                return (False, "Supplier not found")
            name = row[0]
            cursor.execute("SELECT COUNT(*) FROM dbo.Supplier_Offer WHERE supplier_name = ? OR supplier_id = ?", (name, supplier_id))
            count = cursor.fetchone()[0]
            if count > 0:
                return (False, f"Supplier '{name}' sedang digunakan oleh {count} data item offer. Hapus item offer terlebih dahulu.")
            cursor.execute("DELETE FROM dbo.Supplier WHERE id = ?", (supplier_id,))
            self.sql_conn.commit()
            if changed_by:
                self._audit("DELETE", "Supplier", str(supplier_id), changed_by=changed_by, old={"name": name})
            return (True, "")

    # ==================== Primary Supplier Selection ====================

    def set_primary_supplier(self, master_id: str, offer_id: int, changed_by: str = None) -> bool:
        """Set one supplier as primary (selected_for_rfq via is_selected) and syncs price to Master_Data.current_unit_price."""
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            # Set is_selected to 0 for all other offers of this sparepart
            cursor.execute("UPDATE Supplier_Offer SET is_selected = 0 WHERE master_data_id = ?", (str(master_id),))
            # Set is_selected to 1 for the chosen offer
            cursor.execute("UPDATE Supplier_Offer SET is_selected = 1 WHERE id = ? AND master_data_id = ?", (offer_id, str(master_id)))
            
            # Retrieve the selected offer's price and sync to Master_Data.current_unit_price
            cursor.execute("SELECT price FROM Supplier_Offer WHERE id = ?", (offer_id,))
            row = cursor.fetchone()
            if row:
                selected_price = row[0]
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET current_unit_price = ?, 
                        currency = ISNULL(currency, 'IDR'),
                        last_price_update = GETDATE(), 
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE id = ?
                """, (selected_price, changed_by, str(master_id)))
                
            self.sql_conn.commit()
            return True

    def get_primary_supplier(self, master_id: str) -> Optional[Dict]:
        """Get the primary supplier for an item (prioritizes is_selected = 1, falls back to cheapest)."""
        if not self.sql_conn: return None
        with self.sql_conn.cursor() as cursor:
            cursor.execute("""
                SELECT TOP 1 * FROM Supplier_Offer
                WHERE master_data_id = ?
                ORDER BY CASE WHEN ISNULL(is_selected, 0) = 1 THEN 0 ELSE 1 END, price ASC, id DESC
            """, (str(master_id),))
            rows = self._sql_rows_to_dicts(cursor)
            return rows[0] if rows else None

    # ==================== Suppliers (Supplier_Offer) Methods ====================
    
    def get_suppliers_by_master_id(self, master_id) -> List[Dict]:
        """Get all supplier offers for a master data item from SQL Server"""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM Supplier_Offer 
                WHERE master_data_id = ?
                ORDER BY price ASC
            """, (str(master_id),))
            return self._sql_rows_to_dicts(cursor)
    
    def add_supplier_to_master(self, master_id, bin_code: str, supplier_id: int, price: float, price_updated_at: str = None, changed_by: str = None) -> int:
        """Add a new supplier offer (by supplier_id) and sync price to Master_Data."""
        if not self.sql_conn: return 0
        if not price_updated_at:
            price_updated_at = self._now_str()
        clean_price = max(0, int(abs(round(float(price or 0)))))
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT name FROM dbo.Supplier WHERE id = ?", (supplier_id,))
            res = cursor.fetchone()
            supplier_name = res[0] if res else "Unknown"
            
            cursor.execute("""
                INSERT INTO Supplier_Offer (bin, master_data_id, supplier_name, supplier_id, price, price_updated_at)
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bin_code, str(master_id), supplier_name, supplier_id, clean_price, price_updated_at))
            res = cursor.fetchone()
            new_id = int(res[0]) if res and res[0] is not None else 0
            
            if clean_price > 0:
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET current_unit_price = ?, 
                        currency = ISNULL(currency, 'IDR'),
                        last_price_update = GETDATE(), 
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE id = ?
                """, (clean_price, changed_by, str(master_id)))
            
            self.sql_conn.commit()
            return new_id
    
    def delete_supplier_offer(self, offer_id: int) -> bool:
        """Delete a supplier offer from SQL Server"""
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            cursor.execute("DELETE FROM Supplier_Offer WHERE id = ?", (offer_id,))
            self.sql_conn.commit()
            return cursor.rowcount > 0

    def update_supplier_offer(self, offer_id: int, supplier_name: str, price: float, price_updated_at: str = None, changed_by: str = None) -> bool:
        """Update a supplier offer's name and price, syncing price to Master_Data."""
        if not self.sql_conn: return False
        if not price_updated_at:
            price_updated_at = self._now_str()
        clean_price = max(0, int(abs(round(float(price or 0)))))
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT id FROM dbo.Supplier WHERE name = ?", (supplier_name,))
            res2 = cursor.fetchone()
            supplier_id = res2[0] if res2 else None
            
            cursor.execute("""
                UPDATE Supplier_Offer 
                SET supplier_name = ?, supplier_id = ?, price = ?, price_updated_at = ?
                WHERE id = ?
            """, (supplier_name, supplier_id, clean_price, price_updated_at, offer_id))
            
            cursor.execute("SELECT master_data_id FROM Supplier_Offer WHERE id = ?", (offer_id,))
            off_row = cursor.fetchone()
            if off_row and off_row[0] and clean_price > 0:
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET current_unit_price = ?, 
                        currency = ISNULL(currency, 'IDR'),
                        last_price_update = GETDATE(), 
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE id = ?
                """, (clean_price, changed_by, str(off_row[0])))
                
            self.sql_conn.commit()
            return cursor.rowcount > 0

    # ==================== Sparepart Bidding Methods ====================

    def get_bidding(self, year: int = None, search: str = "") -> list:
        """Get all bidding records from SQL Server, dynamically joining Master_Data and Supplier_Offer"""
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            query = '''
                SELECT 
                    b.id,
                    b.bidding_year as year,
                    b.bidding_stage as bid_status,
                    COALESCE(NULLIF(RTRIM(LTRIM(b.supplier_name)), ''), s.supplier_name, '-') as current_supplier,
                    COALESCE(NULLIF(b.price, 0), NULLIF(s.price, 0), NULLIF(m.current_unit_price, 0), 0) as current_price,
                    b.status,
                    b.master_data_id,
                    m.id as part_number,
                    m.up_area,
                    m.line,
                    m.bin,
                    m.item as item_name,
                    m.detail as po_name,
                    m.detail as detail,
                    m.budget_code,
                    ISNULL(m.tbm_per_month, 0) as tbm_per_month,
                    ISNULL(m.lt_per_month, 0) as lt_per_month,
                    m.qty_need_year,
                    m.safety_stock,
                    m.current_stock,
                    ISNULL(m.line, '-') as line_allocation,
                    ISNULL(m.qty_line, 0) as qty_line,
                    -- Qty Bid = MAX(safety_stock + qty_need_year - current_stock, 0)
                    CASE 
                        WHEN (ISNULL(m.safety_stock, 0) + ISNULL(m.qty_need_year, 0) - ISNULL(m.current_stock, 0)) > 0 
                        THEN (ISNULL(m.safety_stock, 0) + ISNULL(m.qty_need_year, 0) - ISNULL(m.current_stock, 0))
                        ELSE 0 
                    END as qty_bid
                FROM Bidding_History b
                JOIN Master_Data m ON b.master_data_id = m.id
                LEFT JOIN (
                    SELECT master_data_id, supplier_name, price,
                           ROW_NUMBER() OVER(PARTITION BY master_data_id ORDER BY CASE WHEN ISNULL(is_selected, 0) = 1 THEN 0 ELSE 1 END, price ASC, id DESC) as rn
                    FROM Supplier_Offer WHERE price > 0
                ) s ON m.id = s.master_data_id AND s.rn = 1
                WHERE 1=1
            '''
            params = []
            if year:
                query += " AND b.bidding_year = ?"
                params.append(year)
            if search:
                like = f"%{search}%"
                query += " AND (m.id LIKE ? OR m.item LIKE ? OR m.bin LIKE ? OR m.line LIKE ? OR m.detail LIKE ? OR m.budget_code LIKE ? OR b.supplier_name LIKE ?)"
                params.extend([like, like, like, like, like, like, like])
            query += " ORDER BY m.bin ASC"
            
            cursor.execute(query, params)
            rows = self._sql_rows_to_dicts(cursor)
            
            # Calculate value
            for row in rows:
                row['value'] = float(row.get('qty_bid', 0)) * float(row.get('current_price', 0))
                
            return rows

    def get_bidding_by_id(self, id: int) -> dict:
        if not self.sql_conn: return None
        with self.sql_conn.cursor() as cursor:
            cursor.execute('''
                SELECT b.*, m.item, m.bin
                FROM Bidding_History b
                JOIN Master_Data m ON b.master_data_id = m.id
                WHERE b.id = ?
            ''', (id,))
            rows = self._sql_rows_to_dicts(cursor)
    def check_duplicate_bidding(self, master_data_id: str = None, bin_code: str = None, item_name: str = None, year: int = None, exclude_id: int = None) -> str | None:
        """Check if a bidding record already exists for the given master_data_id/BIN/item_name in the specified year.
        Returns item/bin description if duplicate exists, else None."""
        if not self.sql_conn or not year:
            return None
        
        with self.sql_conn.cursor() as cursor:
            resolved_id = master_data_id
            if not resolved_id and bin_code:
                cursor.execute("SELECT id FROM dbo.Master_Data WHERE bin = ? AND is_deleted = 0", (bin_code,))
                r = cursor.fetchone()
                if r: resolved_id = r[0]
            if not resolved_id and item_name:
                cursor.execute("SELECT TOP 1 id FROM dbo.Master_Data WHERE item = ? AND is_deleted = 0", (item_name,))
                r = cursor.fetchone()
                if r: resolved_id = r[0]

            if resolved_id:
                if exclude_id:
                    cursor.execute("""
                        SELECT bh.id, m.item, m.bin 
                        FROM dbo.Bidding_History bh
                        JOIN dbo.Master_Data m ON bh.master_data_id = m.id
                        WHERE bh.master_data_id = ? AND bh.bidding_year = ? AND bh.id != ?
                    """, (str(resolved_id), int(year), int(exclude_id)))
                else:
                    cursor.execute("""
                        SELECT bh.id, m.item, m.bin 
                        FROM dbo.Bidding_History bh
                        JOIN dbo.Master_Data m ON bh.master_data_id = m.id
                        WHERE bh.master_data_id = ? AND bh.bidding_year = ?
                    """, (str(resolved_id), int(year)))
                
                row = cursor.fetchone()
                if row:
                    return f"[{row[2] or '-'}] {row[1] or 'Item'}"
            elif bin_code:
                if exclude_id:
                    cursor.execute("""
                        SELECT bh.id, m.item, m.bin 
                        FROM dbo.Bidding_History bh
                        JOIN dbo.Master_Data m ON bh.master_data_id = m.id
                        WHERE m.bin = ? AND bh.bidding_year = ? AND bh.id != ?
                    """, (bin_code, int(year), int(exclude_id)))
                else:
                    cursor.execute("""
                        SELECT bh.id, m.item, m.bin 
                        FROM dbo.Bidding_History bh
                        JOIN dbo.Master_Data m ON bh.master_data_id = m.id
                        WHERE m.bin = ? AND bh.bidding_year = ?
                    """, (bin_code, int(year)))
                row = cursor.fetchone()
                if row:
                    return f"[{row[2] or '-'}] {row[1] or 'Item'}"

        return None

    def create_bidding(self, data: dict, changed_by: str = None) -> int:
        """Create new bidding record with automatic master_data_id resolution."""
        if not self.sql_conn: return 0
        with self.sql_conn.cursor() as cursor:
            master_data_id = data.get('master_data_id')
            if not master_data_id:
                bin_code = data.get('bin', '')
                part_no = data.get('part_number', '')
                if bin_code:
                    cursor.execute("SELECT id FROM Master_Data WHERE bin = ?", (bin_code,))
                    res = cursor.fetchone()
                    if res:
                        master_data_id = res[0]
                if not master_data_id and part_no:
                    cursor.execute("SELECT id FROM Master_Data WHERE id = ?", (part_no,))
                    res = cursor.fetchone()
                    if res:
                        master_data_id = res[0]
                if not master_data_id:
                    item_n = data.get('item_name', '')
                    if item_n:
                        cursor.execute("SELECT TOP 1 id FROM Master_Data WHERE item LIKE ?", (f"%{item_n}%",))
                        res = cursor.fetchone()
                        if res:
                            master_data_id = res[0]
            if not master_data_id:
                return 0 # Cannot insert without valid master_data reference
                    
            c_price = float(data.get('current_price', 0))
            cursor.execute('''
                INSERT INTO Bidding_History (master_data_id, bidding_year, bidding_stage, supplier_name, price, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                master_data_id,
                int(data.get('year') or datetime.now().year),
                str(data.get('bid_status', '1st')),
                str(data.get('current_supplier', '') or '').strip(),
                c_price,
                str(data.get('status', ''))
            ))
            
            if master_data_id and c_price > 0:
                user_name = changed_by or data.get('changed_by')
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET current_unit_price = ?, 
                        currency = ISNULL(currency, 'IDR'),
                        last_price_update = GETDATE(), 
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE id = ?
                """, (c_price, user_name, str(master_data_id)))

            budget_code_val = str(data.get('budget_code', '') or '').strip()
            if master_data_id and budget_code_val:
                user_name = changed_by or data.get('changed_by')
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET budget_code = ?,
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE id = ?
                """, (budget_code_val, user_name, str(master_data_id)))
            elif data.get('bin') and budget_code_val:
                user_name = changed_by or data.get('changed_by')
                cursor.execute("""
                    UPDATE dbo.Master_Data 
                    SET budget_code = ?,
                        last_updated_by = ISNULL(?, last_updated_by),
                        updated_at = GETDATE() 
                    WHERE bin = ?
                """, (budget_code_val, user_name, str(data.get('bin'))))

            cursor.execute("SELECT id FROM Bidding_History WHERE master_data_id = ? AND bidding_year = ?", (master_data_id, int(data.get('year') or datetime.now().year)))
            row = cursor.fetchone()
            new_id = int(row[0]) if (row and row[0] is not None) else 1

            self.sql_conn.commit()
            return new_id

    def update_bidding(self, id: int, data: dict, changed_by: str = None) -> bool:
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            updates = []
            params = []
            
            if 'year' in data:
                updates.append("bidding_year = ?")
                params.append(int(data['year']))
            if 'bid_status' in data:
                updates.append("bidding_stage = ?")
                params.append(data['bid_status'])
            if 'current_supplier' in data:
                updates.append("supplier_name = ?")
                params.append(str(data['current_supplier'] or '').strip())
            if 'current_price' in data:
                updates.append("price = ?")
                params.append(float(data['current_price']))
            if 'status' in data:
                updates.append("status = ?")
                params.append(data['status'])
                
            if updates:
                updates.append("updated_at = GETDATE()")
                query = f"UPDATE Bidding_History SET {', '.join(updates)} WHERE id = ?"
                params.append(id)
                cursor.execute(query, params)
                
                if 'current_price' in data and float(data['current_price'] or 0) > 0:
                    cursor.execute("SELECT master_data_id FROM Bidding_History WHERE id = ?", (id,))
                    b_row = cursor.fetchone()
                    if b_row and b_row[0]:
                        user_name = changed_by or data.get('changed_by')
                        cursor.execute("""
                            UPDATE dbo.Master_Data 
                            SET current_unit_price = ?, 
                                currency = ISNULL(currency, 'IDR'),
                                last_price_update = GETDATE(), 
                                last_updated_by = ISNULL(?, last_updated_by),
                                updated_at = GETDATE() 
                            WHERE id = ?
                        """, (float(data['current_price']), user_name, str(b_row[0])))

                self.sql_conn.commit()
            
            budget_code_val = str(data.get('budget_code', '') or '').strip()
            if budget_code_val:
                user_name = changed_by or data.get('changed_by')
                cursor.execute("SELECT master_data_id FROM Bidding_History WHERE id = ?", (id,))
                b_row = cursor.fetchone()
                m_target_id = b_row[0] if (b_row and b_row[0]) else data.get('master_data_id')
                bin_code = data.get('bin', '')

                if m_target_id:
                    cursor.execute("""
                        UPDATE dbo.Master_Data 
                        SET budget_code = ?,
                            last_updated_by = ISNULL(?, last_updated_by),
                            updated_at = GETDATE() 
                        WHERE id = ?
                    """, (budget_code_val, user_name, str(m_target_id)))
                elif bin_code:
                    cursor.execute("""
                        UPDATE dbo.Master_Data 
                        SET budget_code = ?,
                            last_updated_by = ISNULL(?, last_updated_by),
                            updated_at = GETDATE() 
                        WHERE bin = ?
                    """, (budget_code_val, user_name, str(bin_code)))
                self.sql_conn.commit()
                
            return True

    def delete_bidding(self, id: int, changed_by: str = None) -> bool:
        if not self.sql_conn: return False
        with self.sql_conn.cursor() as cursor:
            cursor.execute("DELETE FROM Bidding_History WHERE id = ?", (id,))
            res = cursor.rowcount > 0
            self.sql_conn.commit()
            if res and changed_by:
                self._audit("DELETE", "Bidding_History", str(id), changed_by=changed_by)
            return res

    def delete_bidding_by_year(self, year: int, changed_by: str = None) -> int:
        """Delete all bidding records for a specific year and log to Audit Log."""
        if not self.sql_conn or not year: return 0
        with self.sql_conn.cursor() as cursor:
            cursor.execute("DELETE FROM Bidding_History WHERE bidding_year = ?", (int(year),))
            deleted_count = cursor.rowcount
            self.sql_conn.commit()
            if deleted_count > 0 and changed_by:
                self._audit("DROP_BIDDING_YEAR", "Bidding_History", str(year), changed_by=changed_by, new={"dropped_count": deleted_count, "year": year})
            return deleted_count

    def get_bidding_years(self) -> list:
        if not self.sql_conn: return []
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT bidding_year FROM Bidding_History ORDER BY bidding_year DESC")
            return [row[0] for row in cursor.fetchall() if row[0]]

    def get_bidding_summary(self, year: int = None) -> dict:
        if not self.sql_conn: return {"total":0, "total_value":0, "first":0, "additional":0}
        
        records = self.get_bidding(year)
        
        total = len(records)
        total_value = sum(r['value'] for r in records)
        first = sum(1 for r in records if r['bid_status'] == '1st')
        additional = sum(1 for r in records if r['bid_status'] == 'Additional')
        
        return {
            "total": total,
            "total_value": total_value,
            "first": first,
            "additional": additional
        }

    def count_bidding_by_year(self, year: int) -> int:
        if not self.sql_conn: return 0
        with self.sql_conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM Bidding_History WHERE bidding_year = ?", (year,))
            res = cursor.fetchone()
            return res[0] if res else 0

    def copy_bidding_year(self, from_year: int, to_year: int, overwrite: bool = False) -> int:
        if not self.sql_conn: return 0
        
        source_rows = self.get_bidding(year=from_year)
        if not source_rows: return 0
        
        inserted = 0
        with self.sql_conn.cursor() as cursor:
            for r in source_rows:
                if not overwrite:
                    cursor.execute(
                        "SELECT id FROM Bidding_History WHERE bidding_year=? AND master_data_id=?",
                        (to_year, r['master_data_id'])
                    )
                    if cursor.fetchone():
                        continue
                
                cursor.execute('''
                    INSERT INTO Bidding_History (master_data_id, bidding_year, bidding_stage, supplier_name, price, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    r['master_data_id'],
                    to_year,
                    r['bid_status'],
                    r['current_supplier'],
                    r['current_price'],
                    r['status']
                ))
                inserted += 1
            self.sql_conn.commit()
            
        return inserted

    def get_setting(self, key: str, default: str = "") -> str:
        """Get a setting value from App_Settings table in SQL Server."""
        if not self.sql_conn:
            return default
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("SELECT setting_value FROM dbo.App_Settings WHERE setting_key = ?", (key,))
                row = cursor.fetchone()
                return row[0] if row else default
        except Exception as e:
            print(f"[DB ERROR] get_setting {key}: {e}")
            return default

    def set_setting(self, key: str, value: str) -> bool:
        """Set a setting value in App_Settings table in SQL Server."""
        if not self.sql_conn:
            return False
        try:
            with self.sql_conn.cursor() as cursor:
                # Check if exists
                cursor.execute("SELECT 1 FROM dbo.App_Settings WHERE setting_key = ?", (key,))
                if cursor.fetchone():
                    cursor.execute(
                        "UPDATE dbo.App_Settings SET setting_value = ?, updated_at = GETDATE() WHERE setting_key = ?",
                        (str(value), key)
                    )
                else:
                    cursor.execute(
                        "INSERT INTO dbo.App_Settings (setting_key, setting_value, updated_at) VALUES (?, ?, GETDATE())",
                        (key, str(value))
                    )
                self.sql_conn.commit()
                return True
        except Exception as e:
            print(f"[DB ERROR] set_setting {key}: {e}")
            return False

    def get_inventory_summary(self) -> dict:
        """Get summary metrics for Master Data inventory."""
        if not self.sql_conn: return {"total": 0, "low_stock": 0, "out_of_stock": 0, "near": 0, "healthy": 0}
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE is_deleted = 0 OR is_deleted IS NULL")
                total = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ISNULL(current_stock, 0) < ISNULL(safety_stock, 0)")
                low_stock = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND ISNULL(current_stock, 0) >= ISNULL(safety_stock, 0) AND ISNULL(current_stock, 0) <= (ISNULL(safety_stock, 0) * 1.2) AND ISNULL(safety_stock, 0) > 0")
                near_safety = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM dbo.Master_Data WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (ISNULL(current_stock, 0) > (ISNULL(safety_stock, 0) * 1.2) OR (ISNULL(safety_stock, 0) = 0 AND ISNULL(current_stock, 0) >= 0))")
                healthy = cursor.fetchone()[0]

                return {
                    "total": total,
                    "low_stock": low_stock,
                    "out_of_stock": 0,
                    "near": near_safety,
                    "healthy": healthy,
                }
        except Exception as e:
            log.warning("get_inventory_summary error: %s", e)
            return {"total": 0, "low_stock": 0, "out_of_stock": 0, "near": 0, "healthy": 0}

    def get_dashboard_recent_activity(self, limit: int = 5, year="All", month="All") -> List[Dict]:
        """Return recent dashboard activity using fast UNION ALL on transaction tables only."""
        if not self.sql_conn:
            return []

        limit = max(1, int(limit or 5))
        top_n = limit * 2  # fetch extra to have enough after sort
        try:
            year_filter_bm = ""
            year_filter_bk = ""
            params_bm = []
            params_bk = []
            if year and str(year) != "All":
                year_filter_bm += " AND YEAR(created_at) = ?"
                year_filter_bk += " AND YEAR(created_at) = ?"
                params_bm.append(int(year))
                params_bk.append(int(year))
            if month and str(month) != "All":
                year_filter_bm += " AND MONTH(created_at) = ?"
                year_filter_bk += " AND MONTH(created_at) = ?"
                params_bm.append(int(month))
                params_bk.append(int(month))

            # Single fast query using UNION ALL - both tables have index on created_at
            query = f"""
                SELECT TOP ({top_n}) activity_type, sparepart, by_user, activity_time
                FROM (
                    SELECT TOP ({top_n})
                        N'Barang Masuk' AS activity_type,
                        ISNULL(item_name, bin) AS sparepart,
                        N'System' AS by_user,
                        created_at AS activity_time
                    FROM dbo.Barang_Masuk
                    WHERE created_at IS NOT NULL {year_filter_bm}
                    ORDER BY created_at DESC
                    UNION ALL
                    SELECT TOP ({top_n})
                        N'Barang Keluar' AS activity_type,
                        ISNULL(item_name, bin) AS sparepart,
                        ISNULL(pic, N'System') AS by_user,
                        created_at AS activity_time
                    FROM dbo.Barang_Keluar
                    WHERE created_at IS NOT NULL AND (approval_status IS NULL OR approval_status = 'approved') {year_filter_bk}
                    ORDER BY created_at DESC
                ) combined
                ORDER BY activity_time DESC
            """
            cur = self._cursor()
            cur.execute(query, params_bm + params_bk)
            rows = cur.fetchall()
            activities = []
            for activity_type, sparepart, by_user, activity_time in rows:
                ts = activity_time or datetime.now()
                activities.append({
                    "type": activity_type or "-",
                    "sparepart": sparepart or "-",
                    "by": by_user or "System",
                    "timestamp": ts,
                    "time": ts.strftime("%d/%m/%Y %H:%M") if hasattr(ts, "strftime") else str(ts),
                })
            activities.sort(key=lambda item: item["timestamp"], reverse=True)
            return activities[:limit]
        except Exception as e:
            log.error("get_dashboard_recent_activity failed: %s", e)
            return []

    def get_dashboard_low_stock_items(self, limit: int = 5) -> List[Dict]:
        """Return top low/near safety stock items from dbo.Master_Data for dashboard."""
        if not self.sql_conn:
            return []

        limit = max(1, int(limit or 5))
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute(f"""
                    SELECT TOP ({limit})
                        item,
                        machine,
                        bin,
                        ISNULL(current_stock, 0) AS current_stock,
                        ISNULL(safety_stock, 0) AS safety_stock,
                        CASE
                            WHEN ISNULL(current_stock, 0) <= ISNULL(safety_stock, 0) THEN 'Below'
                            ELSE 'Near'
                        END AS status
                    FROM dbo.Master_Data
                    WHERE ISNULL(is_deleted, 0) = 0
                      AND ISNULL(safety_stock, 0) > 0
                      AND ISNULL(current_stock, 0) >= 0
                      AND ISNULL(current_stock, 0) <= (ISNULL(safety_stock, 0) * 1.2)
                    ORDER BY
                        ISNULL(current_stock, 0) / CAST(NULLIF(ISNULL(safety_stock, 0), 0) AS FLOAT) ASC,
                        bin ASC
                """)
                return self._sql_rows_to_dicts(cursor)
        except Exception as e:
            print(f"[DB ERROR] get_dashboard_low_stock_items: {e}")
            return []

    def get_email_summary(self) -> dict:
        """Get summary of email notifications sent."""
        if not self.sql_conn: return {"sent_today": 0, "sent_month": 0}
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM dbo.Email_Supplier_Log WHERE CAST(sent_date AS DATE) = CAST(GETDATE() AS DATE)")
                today = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM dbo.Email_Supplier_Log WHERE MONTH(sent_date) = MONTH(GETDATE()) AND YEAR(sent_date) = YEAR(GETDATE())")
                month = cursor.fetchone()[0]
                
                return {"sent_today": today, "sent_month": month}
        except Exception as e:
            # Table might not exist or empty
            return {"sent_today": 0, "sent_month": 0}

    def get_transaction_summary(self) -> dict:
        """Get summary of inward and outward movements."""
        if not self.sql_conn: return {"in": 0, "out": 0}
        try:
            with self.sql_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM dbo.Barang_Masuk
                    WHERE MONTH(created_at) = MONTH(GETDATE())
                      AND YEAR(created_at) = YEAR(GETDATE())
                """)
                in_count = cursor.fetchone()[0] or 0
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM dbo.Barang_Keluar
                    WHERE (approval_status IS NULL OR approval_status = 'approved')
                      AND MONTH(created_at) = MONTH(GETDATE())
                      AND YEAR(created_at) = YEAR(GETDATE())
                """)
                out_count = cursor.fetchone()[0] or 0
                return {"in": in_count, "out": out_count}
        except Exception:
            return {"in": 0, "out": 0}

    def get_inventory_chart_data(self) -> list:
        """Get data for Inventory Health Pie Chart."""
        summary = self.get_inventory_summary()
        return [
            {"label": "Healthy", "value": summary.get('healthy', 0), "color": "#10B981"},
            {"label": "Near Safety", "value": summary.get('near', 0), "color": "#F59E0B"},
            {"label": "Below Safety", "value": summary.get('low_stock', 0), "color": "#F97316"},
            {"label": "Out of Stock", "value": summary.get('out_of_stock', 0), "color": "#EF4444"}
        ]

    def get_movement_chart_data(self) -> dict:
        """Get data for Movement Bar Chart (Last 5 months)."""
        # Simplified for now, in production this would be a GROUP BY Month query
        # Let's mock 5 months based on current year
        months = ["Jan", "Feb", "Mar", "Apr", "May"]
        return {
            "months": months,
            "in": [120, 150, 80, 200, 140], # Example data
            "out": [100, 130, 90, 180, 150]
        }

    def get_strategic_insights(self) -> dict:
        """Get industry-standard strategic insights (simulated for now)."""
        summary = self.get_inventory_summary()
        total = summary.get('total', 1)
        out = summary.get('out_of_stock', 0)
        
        return {
            "itr": 4.2,                 # Inventory Turnover Ratio (times per year)
            "stock_out_rate": (out / total) * 100 if total > 0 else 0,
            "avg_lead_time": 12,        # Days
            "cost_savings": 15.4,       # Percentage saved through bidding
            "dead_stock_val": "Rp 125.0M", # Estimated value of slow-moving items
            "vendor_reliability": 92    # Percentage of on-time responses
        }

    def get_critical_parts_by_supplier(self) -> list:
        """Get a list of parts that are Below Safety Stock for the Checklist Table."""
        if not self.sql_conn: return []
        try:
            with self.sql_conn.cursor() as cursor:
                query = """
                SELECT id, brand, item, current_stock, safety_stock, detail, machine
                FROM dbo.Master_Data
                WHERE current_stock <= safety_stock
                ORDER BY brand, item
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                
                parts = []
                for row in rows:
                    parts.append({
                        "id": row[0],
                        "brand": row[1] if row[1] else "No Brand",
                        "name": row[2],
                        "qty": row[3],
                        "safety": row[4],
                        "detail": row[5],
                        "machine": row[6],
                        "price": 0,
                        "status": "Below Safety"
                    })
                return parts
        except Exception as e:
            log.warning("get_critical_parts_by_supplier error: %s", e)
            return []

    # ==================== Cost Intelligence - Machine Master CRUD ====================
    def get_machines(self, search=None, line=None, status='active'):
        if not self.sql_conn: return []
        query = """
            SELECT m.* 
            FROM dbo.Machine_Master m
            LEFT JOIN dbo.machine_line ml ON m.id = ml.machine_id
            LEFT JOIN dbo.master_line l ON ml.line_id = l.id
            WHERE 1=1
        """
        params = []
        if search:
            like = f"%{search}%"
            query += " AND (m.machine_code LIKE ? OR m.machine_name LIKE ?)"
            params.extend([like, like])
        if line and line != "All":
            query += " AND (m.line = ? OR l.line_code = ?)"
            params.extend([line, line])
        if status:
            query += " AND m.status = ?"
            params.append(status)
        query += " ORDER BY m.machine_code ASC"
        cur = self._cursor()
        cur.execute(query, params)
        
        # Deduplicate results
        rows = self._sql_rows_to_dicts(cur)
        seen = set()
        dedup_rows = []
        for r in rows:
            if r["id"] not in seen:
                seen.add(r["id"])
                dedup_rows.append(r)
        return dedup_rows

    def get_machine_by_id(self, machine_id):
        if not self.sql_conn: return None
        cur = self._cursor()
        cur.execute("SELECT * FROM dbo.Machine_Master WHERE id = ?", (machine_id,))
        rows = self._sql_rows_to_dicts(cur)
        return rows[0] if rows else None

    def create_machine(self, machine_code, machine_name, line, area, machine_type, manufacturer, model, status='active', needs_review=0):
        if not self.sql_conn: return 0
        cur = self._cursor()
        clean_lines = self.normalize_line_value(line)
        primary_line = clean_lines[0] if clean_lines else "UNKNOWN"
        
        cur.execute("""
            INSERT INTO dbo.Machine_Master (machine_code, machine_name, line, area, machine_type, manufacturer, model, status, needs_review)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (machine_code, machine_name, primary_line, area, machine_type, manufacturer, model, status, needs_review))
        res = cur.fetchone()
        machine_id = int(res[0]) if res and res[0] is not None else 0
        
        # Insert mappings
        for l in clean_lines:
            if l == "UNKNOWN":
                continue
            cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (l,))
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (l, f"Line {l}"))
                line_id = cur.fetchone()[0]
            else:
                line_id = row[0]
            cur.execute("""
                IF NOT EXISTS (SELECT 1 FROM dbo.machine_line WHERE machine_id = ? AND line_id = ?)
                INSERT INTO dbo.machine_line (machine_id, line_id) VALUES (?, ?)
            """, (machine_id, line_id, machine_id, line_id))
            
        self._commit()
        return machine_id

    def update_machine(self, machine_id, machine_code, machine_name, line, area, machine_type, manufacturer, model, status, needs_review=0):
        if not self.sql_conn: return False
        cur = self._cursor()
        clean_lines = self.normalize_line_value(line)
        primary_line = clean_lines[0] if clean_lines else "UNKNOWN"
        
        cur.execute("""
            UPDATE dbo.Machine_Master
            SET machine_code = ?, machine_name = ?, line = ?, area = ?, machine_type = ?, manufacturer = ?, model = ?, status = ?, needs_review = ?, updated_at = GETDATE()
            WHERE id = ?
        """, (machine_code, machine_name, primary_line, area, machine_type, manufacturer, model, status, needs_review, machine_id))
        
        # Sync mappings
        cur.execute("DELETE FROM dbo.machine_line WHERE machine_id = ?", (machine_id,))
        for l in clean_lines:
            if l == "UNKNOWN":
                continue
            cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (l,))
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (l, f"Line {l}"))
                line_id = cur.fetchone()[0]
            else:
                line_id = row[0]
            cur.execute("""
                INSERT INTO dbo.machine_line (machine_id, line_id) VALUES (?, ?)
            """, (machine_id, line_id))
            
        self._commit()
        return True

    def delete_machine_soft(self, machine_id):
        if not self.sql_conn: return False
        cur = self._cursor()
        cur.execute("UPDATE dbo.Machine_Master SET status = 'inactive', updated_at = GETDATE() WHERE id = ?", (machine_id,))
        self._commit()
        return cur.rowcount > 0

    def get_additional_lines_for_machine(self, machine_id):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("""
            SELECT ml.line_code FROM dbo.machine_line mline
            JOIN dbo.master_line ml ON mline.line_id = ml.id
            WHERE mline.machine_id = ? AND mline.is_primary = 0 AND mline.is_active = 1
            ORDER BY ml.line_code ASC
        """, (machine_id,))
        return [row[0] for row in cur.fetchall()]

    def save_machine_line_mappings(self, machine_id, primary_line, additional_lines):
        if not self.sql_conn: return False
        cur = self._cursor()
        
        # Deactivate all existing mappings for this machine
        cur.execute("UPDATE dbo.machine_line SET is_active = 0 WHERE machine_id = ?", (machine_id,))
        
        def _get_or_create_line_id(ln):
            ln = ln.strip().upper()
            cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (ln,))
            row = cur.fetchone()
            if row: return row[0]
            cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (ln, f"Line {ln}"))
            return cur.fetchone()[0]

        # Primary line
        p_id = None
        if primary_line:
            primary_line = primary_line.upper().strip()
            p_id = _get_or_create_line_id(primary_line)
            cur.execute("SELECT id FROM dbo.machine_line WHERE machine_id = ? AND line_id = ?", (machine_id, p_id))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE dbo.machine_line SET is_active = 1, is_primary = 1 WHERE id = ?", (row[0],))
            else:
                cur.execute("INSERT INTO dbo.machine_line (machine_id, line_id, is_primary, is_active) VALUES (?, ?, 1, 1)", (machine_id, p_id))
                
        # Additional lines
        for line in additional_lines:
            line = line.upper().strip()
            if line == primary_line:
                continue
            l_id = _get_or_create_line_id(line)
            cur.execute("SELECT id FROM dbo.machine_line WHERE machine_id = ? AND line_id = ?", (machine_id, l_id))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE dbo.machine_line SET is_active = 1, is_primary = 0 WHERE id = ?", (row[0],))
            else:
                cur.execute("INSERT INTO dbo.machine_line (machine_id, line_id, is_primary, is_active) VALUES (?, ?, 0, 1)", (machine_id, l_id))
                
        self._commit()
        return True

    def get_line_statistics(self):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("""
            SELECT 
                line,
                COUNT(*) as total_machines,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_machines,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_machines
            FROM dbo.Machine_Master
            GROUP BY line
        """)
        return self._sql_rows_to_dicts(cur)

    # ==================== Cost Intelligence - Sparepart Machine Mapping ====================
    def get_sparepart_machine_mapping(self, search=None, line=None):
        if not self.sql_conn: return []
        query = """
            SELECT u.*, m.machine_code, m.machine_name, m.line, md.item as item_name, md.bin
            FROM dbo.Sparepart_Machine_Usage u
            JOIN dbo.Machine_Master m ON u.machine_id = m.id
            JOIN dbo.Master_Data md ON u.master_data_id = md.id
            WHERE u.is_active = 1
        """
        params = []
        if search:
            like = f"%{search}%"
            query += " AND (md.id LIKE ? OR md.item LIKE ? OR md.bin LIKE ? OR m.machine_name LIKE ?)"
            params.extend([like, like, like, like])
        if line and line != "All":
            query += " AND m.line = ?"
            params.append(line)
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_machines_by_sparepart(self, master_data_id):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("""
            SELECT u.*, m.machine_code, m.machine_name, m.line
            FROM dbo.Sparepart_Machine_Usage u
            JOIN dbo.Machine_Master m ON u.machine_id = m.id
            WHERE u.master_data_id = ? AND u.is_active = 1
        """, (master_data_id,))
        return self._sql_rows_to_dicts(cur)

    def get_spareparts_by_machine(self, machine_id):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("""
            SELECT u.*, md.item as item_name, md.bin, md.brand
            FROM dbo.Sparepart_Machine_Usage u
            JOIN dbo.Master_Data md ON u.master_data_id = md.id
            WHERE u.machine_id = ? AND u.is_active = 1
        """, (machine_id,))
        return self._sql_rows_to_dicts(cur)

    def save_sparepart_machine_mapping(self, master_data_id, machine_id, qty_need_year, safety_stock, criticality):
        if not self.sql_conn: return False
        cur = self._cursor()
        # Check if mapping exists (active or inactive)
        cur.execute("SELECT id FROM dbo.Sparepart_Machine_Usage WHERE master_data_id = ? AND machine_id = ?", (master_data_id, machine_id))
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE dbo.Sparepart_Machine_Usage
                SET qty_need_year = ?, safety_stock = ?, criticality = ?, is_active = 1, updated_at = GETDATE()
                WHERE id = ?
            """, (qty_need_year, safety_stock, criticality, row[0]))
        else:
            cur.execute("""
                INSERT INTO dbo.Sparepart_Machine_Usage (master_data_id, machine_id, qty_need_year, safety_stock, criticality, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (master_data_id, machine_id, qty_need_year, safety_stock, criticality))
        self._commit()
        return True

    def deactivate_sparepart_machine_mapping(self, master_data_id, machine_id):
        if not self.sql_conn: return False
        cur = self._cursor()
        cur.execute("""
            UPDATE dbo.Sparepart_Machine_Usage
            SET is_active = 0, updated_at = GETDATE()
            WHERE master_data_id = ? AND machine_id = ?
        """, (master_data_id, machine_id))
        self._commit()
        return cur.rowcount > 0

    # ==================== Cost Intelligence - Lookup Helpers ====================
    def get_distinct_lines(self):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("SELECT line_code FROM dbo.master_line WHERE status = 'active' ORDER BY line_code ASC")
        return [row[0] for row in cur.fetchall() if row[0]]

    def get_machines_by_line(self, line):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("""
            SELECT m.id, m.machine_code, m.machine_name, m.line
            FROM dbo.Machine_Master m
            LEFT JOIN dbo.machine_line ml ON m.id = ml.machine_id
            LEFT JOIN dbo.master_line l ON ml.line_id = l.id
            WHERE (m.line = ? OR l.line_code = ?) AND m.status = 'active'
            ORDER BY m.machine_code ASC
        """, (line, line))
        # Deduplicate
        rows = self._sql_rows_to_dicts(cur)
        seen = set()
        dedup = []
        for r in rows:
            if r["id"] not in seen:
                seen.add(r["id"])
                dedup.append(r)
        return dedup


    def get_master_data_by_bin(self, bin):
        if not self.sql_conn: return None
        cur = self._cursor()
        cur.execute("SELECT id, item, detail, brand, bin, line, current_stock, current_unit_price FROM dbo.Master_Data WHERE bin = ? AND is_deleted = 0", (bin,))
        rows = self._sql_rows_to_dicts(cur)
        return rows[0] if rows else None

    def get_price_for_master_data(self, master_data_id):
        """Get unit price for a sparepart. Priority: starred supplier offer > current_unit_price > cheapest supplier offer."""
        if not self.sql_conn: return 0.0
        cur = self._cursor()
        
        # 1. Starred supplier offer check
        cur.execute("SELECT price FROM dbo.Supplier_Offer WHERE master_data_id = ? AND is_selected = 1 AND price > 0", (master_data_id,))
        row = cur.fetchone()
        if row and row[0] is not None:
            return float(row[0])
            
        # 2. Master Data current_unit_price fallback
        cur.execute("SELECT current_unit_price FROM dbo.Master_Data WHERE id = ?", (master_data_id,))
        row2 = cur.fetchone()
        if row2 and row2[0] is not None and float(row2[0]) > 0:
            return float(row2[0])

        # 3. Cheapest supplier offer fallback
        cur.execute("SELECT MIN(price) FROM dbo.Supplier_Offer WHERE master_data_id = ? AND price > 0", (master_data_id,))
        row3 = cur.fetchone()
        if row3 and row3[0] is not None:
            return float(row3[0])

        return 0.0

    # ==================== Cost Intelligence - Improved Barang Keluar Transaction ====================
    def create_barang_keluar_with_cost(self, tanggal, bin_code, item_name, qty, rem_name, master_data_id=None, line=None, machine_id=None, maintenance_type=None, pic=None, user_id=None, approval_status='approved', failure_reason=None, action_note=None):
        if not self.sql_conn: return ""
        
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            # 1. Resolve master_data_id & get stock details
            if master_data_id:
                cursor.execute("SELECT id, bin, item, current_stock, current_unit_price FROM dbo.Master_Data WHERE id = ? AND is_deleted = 0", (master_data_id,))
            else:
                cursor.execute("SELECT id, bin, item, current_stock, current_unit_price FROM dbo.Master_Data WHERE bin = ? AND is_deleted = 0", (bin_code,))
            
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Barang dengan BIN '{bin_code}' / ID '{master_data_id}' tidak ditemukan di Master Data!")
            
            m_id = row[0]
            m_bin = row[1]
            m_item = row[2]
            current_stock = float(row[3] or 0)
            
            # 2. Validate stock (only when directly approved)
            if approval_status == 'approved':
                if current_stock < float(qty):
                    raise ValueError(f"Stok tidak mencukupi! Sisa: {current_stock}, Diminta: {qty}")
                
            # 3. Get price snapshot
            unit_price = self.get_price_for_master_data(m_id)
            total_cost = float(qty) * unit_price
            
            # 4. Generate new ID
            new_id = self._next_upf_id("seq_upf_bkeluar")
            
            # 5. Insert outgoing record
            insert_data = {
                "tanggal": tanggal,
                "bin": m_bin,
                "item_name": m_item,
                "qty": float(qty),
                "rem_name": rem_name,
                "master_id": m_id,
                "master_data_id": m_id,
                "line": line,
                "machine_id": machine_id,
                "maintenance_type": maintenance_type,
                "unit_price_snapshot": unit_price,
                "total_cost_snapshot": total_cost,
                "Unit_Price": unit_price,
                "Total_Cost": total_cost,
                "pic": pic,
                "user_id": user_id,
                "approval_status": approval_status,
                "created_at": self._now_str()
            }
            
            columns = ', '.join(insert_data.keys())
            placeholders = ', '.join(['?' for _ in insert_data])
            cursor.execute(f"INSERT INTO dbo.Barang_Keluar ({columns}) VALUES ({placeholders})", list(insert_data.values()))
            
            # 6. Update Master_Data.current_stock only when directly approved
            if approval_status == 'approved':
                cursor.execute(
                    "UPDATE dbo.Master_Data SET current_stock = current_stock - ?, updated_at = GETDATE() WHERE id = ?",
                    (float(qty), m_id)
                )
            
            conn.commit()
            
            # Learn compatibility silently (only for approved transactions)
            if approval_status == 'approved':
                try:
                    self.record_actual_usage(m_id, line, machine_id, pic)
                except Exception as ex:
                    log.warning("Auto learning failed in create_barang_keluar_with_cost: %s", ex)

            log.info("Barang Keluar created (id=%s qty=%s cost=%s status=%s)", new_id, qty, total_cost, approval_status)
            return new_id
        except Exception as e:
            conn.rollback()
            log.error("Transaction create_barang_keluar_with_cost failed: %s", e, exc_info=True)
            raise

    def get_pending_barang_keluar(self) -> list:
        """Get all Barang Keluar records with approval_status='pending'."""
        if not self.sql_conn:
            return []
        cursor = self._cursor()
        cursor.execute("""
            SELECT bk.*, 
                   u.username as submitted_by_username, 
                   u.full_name as submitted_by_fullname,
                   m.machine_code,
                   m.machine_name
            FROM dbo.Barang_Keluar bk
            LEFT JOIN dbo.Users u ON bk.user_id = u.id
            LEFT JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE bk.approval_status = 'pending'
            ORDER BY bk.tanggal DESC
        """)
        return self._sql_rows_to_dicts(cursor)

    def approve_barang_keluar(self, record_id: str, approved_by: str) -> bool:
        """Approve a pending Barang Keluar record and deduct stock."""
        if not self.sql_conn:
            return False
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        try:
            # Fetch the pending record
            cursor.execute(
                "SELECT master_data_id, master_id, qty, line, machine_id, pic FROM dbo.Barang_Keluar WHERE id = ? AND approval_status = 'pending'",
                (record_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"Record '{record_id}' tidak ditemukan atau bukan status pending.")
            m_id = row[0] or row[1]
            qty = float(row[2])
            line_val = row[3]
            machine_id_val = row[4]
            pic_val = row[5]

            # Validate & deduct stock depending on table
            cursor.execute("SELECT part_number, qty, price_per_unit FROM dbo.Electrical_Parts WHERE part_number = ?", (m_id,))
            elec_row = cursor.fetchone()
            if elec_row:
                current_stock = float(elec_row[1] or 0)
                price_per_unit = float(elec_row[2] or 0)
                if current_stock < qty:
                    raise ValueError(f"Stok electrical tidak mencukupi! Sisa: {current_stock}, Diminta: {qty}")
                new_qty = max(0.0, current_stock - qty)
                new_val = new_qty * price_per_unit
                cursor.execute(
                    "UPDATE dbo.Electrical_Parts SET qty = ?, value = ? WHERE part_number = ?",
                    (new_qty, new_val, m_id)
                )
            else:
                cursor.execute("SELECT current_stock FROM dbo.Master_Data WHERE id = ?", (m_id,))
                stock_row = cursor.fetchone()
                if not stock_row:
                    raise ValueError("Master data atau Electrical part tidak ditemukan.")
                current_stock = float(stock_row[0] or 0)
                if current_stock < qty:
                    raise ValueError(f"Stok tidak mencukupi! Sisa: {current_stock}, Diminta: {qty}")
                cursor.execute(
                    "UPDATE dbo.Master_Data SET current_stock = current_stock - ?, updated_at = GETDATE() WHERE id = ?",
                    (qty, m_id)
                )

            # Update approval status
            cursor.execute("""
                UPDATE dbo.Barang_Keluar
                SET approval_status = 'approved', approved_by = ?, approved_at = GETDATE()
                WHERE id = ?
            """, (approved_by, record_id))
            conn.commit()

            # Trigger auto learning line & machine mapping
            if m_id:
                try:
                    self.record_actual_usage(m_id, line_val, machine_id_val, pic_val)
                except Exception as ex:
                    log.warning("record_actual_usage failed in approve_barang_keluar: %s", ex)

            log.info("Barang Keluar '%s' approved by '%s', stock deducted.", record_id, approved_by)
            return True
        except Exception as e:
            conn.rollback()
            log.error("approve_barang_keluar failed: %s", e, exc_info=True)
            raise

    def reject_barang_keluar(self, record_id: str, rejected_by: str) -> bool:
        """Reject a pending Barang Keluar record (no stock change)."""
        if not self.sql_conn:
            return False
        cursor = self._cursor()
        try:
            cursor.execute("""
                UPDATE dbo.Barang_Keluar
                SET approval_status = 'rejected', approved_by = ?, approved_at = GETDATE()
                WHERE id = ? AND approval_status = 'pending'
            """, (rejected_by, record_id))
            self.sql_conn.commit()
            log.info("Barang Keluar '%s' rejected by '%s'.", record_id, rejected_by)
            return cursor.rowcount > 0
        except Exception as e:
            log.error("reject_barang_keluar failed: %s", e, exc_info=True)
            raise

    # ==================== Cost Intelligence - Dashboard Queries ====================
    def get_cost_per_line(self, start_date=None, end_date=None):
        if not self.sql_conn: return []
        query = """
            SELECT 
                ISNULL(bk.line, 'Unknown') as line,
                COUNT(DISTINCT bk.machine_id) as total_machine,
                COUNT(DISTINCT bk.id) as transaction_count,
                COUNT(DISTINCT ISNULL(bk.master_data_id, bk.master_id)) as unique_sparepart_count,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as total_cost
            FROM dbo.Barang_Keluar bk
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
        """
        params = []
        if start_date:
            query += " AND CAST(bk.tanggal AS DATE) >= CAST(? AS DATE)"
            params.append(start_date)
        if end_date:
            query += " AND CAST(bk.tanggal AS DATE) <= CAST(? AS DATE)"
            params.append(end_date)
        query += " GROUP BY bk.line ORDER BY total_cost DESC"
        
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_cost_per_machine(self, start_date=None, end_date=None, line=None):
        if not self.sql_conn: return []
        query = """
            SELECT 
                m.id as machine_id,
                m.machine_code,
                m.machine_name,
                m.machine_type,
                m.status,
                m.line,
                SUM(bk.qty) as total_qty,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as total_cost,
                COUNT(bk.id) as transaction_count,
                COUNT(DISTINCT ISNULL(bk.master_data_id, bk.master_id)) as unique_sparepart_count
            FROM dbo.Barang_Keluar bk
            JOIN dbo.Machine_Master m ON bk.machine_id = m.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
        """
        params = []
        if start_date:
            query += " AND CAST(bk.tanggal AS DATE) >= CAST(? AS DATE)"
            params.append(start_date)
        if end_date:
            query += " AND CAST(bk.tanggal AS DATE) <= CAST(? AS DATE)"
            params.append(end_date)
        if line and line != "All":
            query += " AND bk.line = ?"
            params.append(line)
            
        query += " GROUP BY m.id, m.machine_code, m.machine_name, m.machine_type, m.status, m.line ORDER BY total_cost DESC"
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_cost_detail_by_line(self, line, start_date=None, end_date=None):
        if not self.sql_conn: return []
        query = """
            SELECT 
                ISNULL(bk.master_data_id, bk.master_id) as master_data_id,
                bk.item_name,
                bk.bin,
                SUM(bk.qty) as qty_total,
                COUNT(DISTINCT bk.id) as frequency_count,
                AVG(ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))) as unit_price_avg,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as total_cost
            FROM dbo.Barang_Keluar bk
            WHERE bk.line = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
        """
        params = [line]
        if start_date:
            query += " AND CAST(bk.tanggal AS DATE) >= CAST(? AS DATE)"
            params.append(start_date)
        if end_date:
            query += " AND CAST(bk.tanggal AS DATE) <= CAST(? AS DATE)"
            params.append(end_date)
            
        query += " GROUP BY ISNULL(bk.master_data_id, bk.master_id), bk.item_name, bk.bin ORDER BY total_cost DESC"
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def get_cost_detail_by_machine(self, machine_id, start_date=None, end_date=None):
        if not self.sql_conn: return []
        query = """
            SELECT 
                ISNULL(bk.master_data_id, bk.master_id) as master_data_id,
                bk.item_name,
                bk.bin,
                SUM(bk.qty) as qty_total,
                COUNT(*) as frequency_count,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as total_cost,
                bk.maintenance_type
            FROM dbo.Barang_Keluar bk
            WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
        """
        params = [machine_id]
        if start_date:
            query += " AND CAST(bk.tanggal AS DATE) >= CAST(? AS DATE)"
            params.append(start_date)
        if end_date:
            query += " AND CAST(bk.tanggal AS DATE) <= CAST(? AS DATE)"
            params.append(end_date)
            
        query += " GROUP BY ISNULL(bk.master_data_id, bk.master_id), bk.item_name, bk.bin, bk.maintenance_type ORDER BY total_cost DESC"
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def seed_bidding_dummy_data(self):
        pass

    # ==================== Cost Intelligence - Improvement Tracker CRUD ====================
    def get_improvements(self, search=None, status=None, line=None):
        if not self.sql_conn: return []
        query = """
            SELECT imp.*, m.machine_code, m.machine_name, md.item as item_name, md.bin
            FROM dbo.Improvement_Action imp
            LEFT JOIN dbo.Machine_Master m ON imp.machine_id = m.id
            LEFT JOIN dbo.Master_Data md ON imp.master_data_id = md.id
            WHERE 1=1
        """
        params = []
        if search:
            like = f"%{search}%"
            query += " AND (imp.finding_title LIKE ? OR imp.pic LIKE ?)"
            params.extend([like, like])
        if status and status != "All":
            query += " AND imp.status = ?"
            params.append(status.lower())
        if line and line != "All":
            query += " AND imp.line = ?"
            params.append(line)
        query += " ORDER BY imp.created_at DESC"
        cur = self._cursor()
        cur.execute(query, params)
        return self._sql_rows_to_dicts(cur)

    def create_improvement(self, finding_title, line, machine_id, master_data_id, problem_description, root_cause, action_plan, pic, due_date, status, before_cost, after_cost, estimated_saving):
        if not self.sql_conn: return 0
        cur = self._cursor()
        cur.execute("""
            INSERT INTO dbo.Improvement_Action 
                (finding_title, line, machine_id, master_data_id, problem_description, root_cause, action_plan, pic, due_date, status, before_cost, after_cost, estimated_saving, created_at)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        """, (finding_title, line, machine_id, master_data_id, problem_description, root_cause, action_plan, pic, due_date, status, before_cost, after_cost, estimated_saving))
        res = cur.fetchone()
        val = int(res[0]) if res and res[0] is not None else 0
        self._commit()
        return val

    def update_improvement(self, id, finding_title, line, machine_id, master_data_id, problem_description, root_cause, action_plan, pic, due_date, status, before_cost, after_cost, estimated_saving):
        if not self.sql_conn: return False
        cur = self._cursor()
        cur.execute("""
            UPDATE dbo.Improvement_Action
            SET finding_title = ?, line = ?, machine_id = ?, master_data_id = ?, problem_description = ?,
                root_cause = ?, action_plan = ?, pic = ?, due_date = ?, status = ?,
                before_cost = ?, after_cost = ?, estimated_saving = ?, updated_at = GETDATE()
            WHERE id = ?
        """, (finding_title, line, machine_id, master_data_id, problem_description, root_cause, action_plan, pic, due_date, status, before_cost, after_cost, estimated_saving, id))
        self._commit()
        return cur.rowcount > 0

    def delete_improvement(self, id):
        if not self.sql_conn: return False
        cur = self._cursor()
        cur.execute("DELETE FROM dbo.Improvement_Action WHERE id = ?", (id,))
        self._commit()
        return cur.rowcount > 0

    # ==================== Cost Intelligence - Master Data Analysis Backup ====================
    def normalize_line_value(self, line_text) -> list[str]:
        if not line_text:
            return ["UNKNOWN"]
        s = str(line_text).strip().upper()
        if not s:
            return ["UNKNOWN"]
            
        import re
        # Remove noise words: LINE, LINES, AREA
        s = re.sub(r'\b(LINE|LINES|AREA)\b', '', s)
        
        # Split by separator symbols and spaces
        tokens = re.split(r'[\/,;\|\+&\s\-]+', s)
        
        # Also handle "AND" explicitly if it wasn't split by spaces
        final_tokens = []
        for tok in tokens:
            tok = tok.strip()
            if not tok:
                continue
            if tok == "AND":
                continue
            final_tokens.append(tok)
            
        if not final_tokens:
            return ["UNKNOWN"]
            
        # Deduplicate
        seen = set()
        dedup_tokens = []
        for t in final_tokens:
            if t not in seen:
                seen.add(t)
                dedup_tokens.append(t)
                
        # Natural sorting key function
        def natural_sort_key(token):
            return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', token)]
            
        dedup_tokens.sort(key=natural_sort_key)
        return dedup_tokens

    def generate_master_data_analysis_backup(self, generated_by=None, clear_existing=True):
        return {"success": False, "error": "Inventory Intelligence backup has been removed"}

    def get_master_data_analysis_backup(self, search=None, line=None, page=1, page_size=50, suspicious_only=False):
        return []

    def get_master_data_analysis_backup_count(self, search=None, line=None, suspicious_only=False):
        return 0

    def get_master_data_analysis_summary(self):
        return {
            "master_data_total_rows": 0, "backup_total_rows": 0,
            "multiline_item_count": 0, "unknown_line_count": 0,
            "suspicious_line_count": 0, "clean_line_count": 0,
            "last_generated_at": "-"
        }

    def get_suspicious_analysis_lines(self):
        return []

    def compare_master_vs_backup(self):
        return {"master_total": 0, "backup_unique_ids": 0, "missing_ids": [], "backup_total": 0, "duplicates_count": 0}

    def get_distinct_clean_lines(self):
        if not self.sql_conn: return []
        cur = self._cursor()
        cur.execute("SELECT DISTINCT clean_line FROM dbo.Master_Data_Analysis_Backup WHERE is_active = 1 ORDER BY clean_line ASC")
        return [row[0] for row in cur.fetchall() if row[0]]

    # ═══════════════════════════════════════════════════════════════════════════
    # SPAREPART LINE MAPPING — CRUD
    # ═══════════════════════════════════════════════════════════════════════════

    def get_line_mapping_for_sparepart(self, master_data_id: str) -> List[Dict]:
        """
        Return all active line mappings for one sparepart.
        Each dict: {id, master_data_id, line, created_at, updated_at, is_active}
        """
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("""
            SELECT slm.id, slm.sparepart_id AS master_data_id, ml.line_code AS line, slm.created_at, slm.updated_at, slm.is_active
            FROM dbo.sparepart_line_mapping slm
            JOIN dbo.master_line ml ON slm.line_id = ml.id
            WHERE slm.sparepart_id = ? AND slm.is_active = 1
            ORDER BY ml.line_code ASC
        """, (master_data_id,))
        return self._sql_rows_to_dicts(cur)

    def get_compatible_lines_display(self, master_data_id: str) -> str:
        """
        Return a comma-separated string of active compatible lines for display,
        e.g. 'T3, T4, B19'.  Returns '-' when no mapping exists.
        """
        mappings = self.get_line_mapping_for_sparepart(master_data_id)
        if not mappings:
            return "-"
        return ", ".join(m["line"] for m in mappings)

    def get_all_line_mappings(self, search: str = "", page: int = 1, page_size: int = 50) -> List[Dict]:
        """
        Paginated list of master data rows with their compatible-line counts.
        Returns dicts: {id, item, bin, current_stock, unit_price, compatible_lines, mapping_count}
        """
        if not self.sql_conn:
            return []
        offset = (page - 1) * page_size
        params: list = []
        where = "WHERE (md.is_deleted = 0 OR md.is_deleted IS NULL)"
        if search:
            where += " AND (md.id LIKE ? OR md.item LIKE ? OR md.bin LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])
        cur = self._cursor()
        cur.execute(f"""
            SELECT
                md.id,
                md.item,
                md.bin,
                md.current_stock,
                md.current_unit_price AS unit_price,
                ISNULL(
                    (SELECT STRING_AGG(ml.line_code, ', ') WITHIN GROUP (ORDER BY ml.line_code)
                     FROM dbo.sparepart_line_mapping slm
                     JOIN dbo.master_line ml ON slm.line_id = ml.id
                     WHERE slm.sparepart_id = md.id AND slm.is_active = 1),
                    '-'
                ) AS compatible_lines,
                ISNULL(
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping slm2
                     WHERE slm2.sparepart_id = md.id AND slm2.is_active = 1),
                    0
                ) AS mapping_count
            FROM dbo.Master_Data md
            {where}
            ORDER BY md.bin ASC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, params + [offset, page_size])
        return self._sql_rows_to_dicts(cur)

    def get_all_line_mappings_count(self, search: str = "") -> int:
        """Count total master data rows for Line Mapping menu pagination."""
        if not self.sql_conn:
            return 0
        params: list = []
        where = "WHERE (is_deleted = 0 OR is_deleted IS NULL)"
        if search:
            where += " AND (id LIKE ? OR item LIKE ? OR bin LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term])
        cur = self._cursor()
        cur.execute(f"SELECT COUNT(*) FROM dbo.Master_Data {where}", params)
        row = cur.fetchone()
        return row[0] if row else 0

    def add_line_mapping(self, master_data_id: str, line: str) -> Dict:
        """
        Add a new compatible-line mapping for a sparepart.
        If it already exists (even if inactive), re-activates it.
        Returns {success, id, error}.
        """
        if not self.sql_conn:
            return {"success": False, "error": "Not connected"}
        line = line.strip().upper()
        if not line:
            return {"success": False, "error": "Line value is required"}
        try:
            cur = self._cursor()
            # Resolve or create the line in master_line
            cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line,))
            row = cur.fetchone()
            if not row:
                cur.execute("INSERT INTO dbo.master_line (line_code, line_name, status) OUTPUT INSERTED.id VALUES (?, ?, 'active')", (line, f"Line {line}"))
                line_id = cur.fetchone()[0]
            else:
                line_id = row[0]

            # Check if a row already exists in mapping (any is_active value)
            cur.execute("""
                SELECT id, is_active FROM dbo.sparepart_line_mapping
                WHERE sparepart_id = ? AND line_id = ?
            """, (master_data_id, line_id))
            existing = cur.fetchone()
            if existing:
                if existing[1] == 1:
                    return {"success": False, "error": f"Line '{line}' already mapped for this sparepart"}
                # Re-activate soft-deleted row
                cur.execute("""
                    UPDATE dbo.sparepart_line_mapping
                    SET is_active = 1, updated_at = GETDATE()
                    WHERE id = ?
                """, (existing[0],))
                self._commit()
                return {"success": True, "id": existing[0]}
            # Insert new
            cur.execute("""
                INSERT INTO dbo.sparepart_line_mapping (sparepart_id, line_id)
                OUTPUT INSERTED.id
                VALUES (?, ?)
            """, (master_data_id, line_id))
            row = cur.fetchone()
            self._commit()
            return {"success": True, "id": row[0] if row else None}
        except Exception as ex:
            log.error("add_line_mapping failed %s/%s: %s", master_data_id, line, ex)
            return {"success": False, "error": str(ex)}

    def deactivate_line_mapping(self, mapping_id: int) -> Dict:
        """Soft-delete a line mapping: sets is_active = 0. Returns {success, error}."""
        if not self.sql_conn:
            return {"success": False, "error": "Not connected"}
        try:
            cur = self._cursor()
            cur.execute("""
                UPDATE dbo.sparepart_line_mapping
                SET is_active = 0, updated_at = GETDATE()
                WHERE id = ?
            """, (mapping_id,))
            self._commit()
            return {"success": True}
        except Exception as ex:
            log.error("deactivate_line_mapping id=%s: %s", mapping_id, ex)
            return {"success": False, "error": str(ex)}

    def get_available_lines_for_dropdown(self) -> List[str]:
        """
        Return distinct production lines available as dropdown options.
        Loads from master_line table where status is active.
        """
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("SELECT line_code FROM dbo.master_line WHERE status = 'active' ORDER BY line_code ASC")
        return [row[0] for row in cur.fetchall() if row[0]]

    # ═══════════════════════════════════════════════════════════════════════════
    # ENTERPRISE COMPATIBILITY MANAGEMENT — EXTENSION METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def get_line_explorer_data(self) -> list:
        """Retrieves aggregated explorer metrics for each active production line."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("""
            SELECT 
                ml.line_code,
                (SELECT COUNT(DISTINCT mline.machine_id) 
                 FROM dbo.machine_line mline 
                 WHERE mline.line_id = ml.id AND mline.is_active = 1) AS total_machines,
                (SELECT COUNT(DISTINCT slm.sparepart_id) 
                 FROM dbo.sparepart_line_mapping slm 
                 WHERE slm.line_id = ml.id AND slm.is_active = 1) AS total_spareparts,
                (SELECT COUNT(DISTINCT mline.machine_id) 
                 FROM dbo.machine_line mline 
                 JOIN dbo.Machine_Master mm ON mline.machine_id = mm.id 
                 WHERE mline.line_id = ml.id AND mline.is_active = 1 AND mm.status = 'active') AS active_machines,
                (SELECT COUNT(DISTINCT slm.sparepart_id) 
                 FROM dbo.sparepart_line_mapping slm 
                 WHERE slm.line_id = ml.id AND slm.is_active = 1 AND slm.approved = 0) AS pending_review
            FROM dbo.master_line ml
            WHERE ml.status = 'active'
            ORDER BY ml.line_code ASC
        """)
        return self._sql_rows_to_dicts(cur)

    def get_line_kpis(self, line_code: str) -> dict:
        """Retrieves overall KPIs for a specific production line."""
        defaults = {"total_machines": 0, "compatible_parts": 0, "monthly_qty": 0.0, "monthly_cost": 0.0, "pending_review": 0, "avg_confidence": 0.0}
        if not self.sql_conn:
            return defaults
        cur = self._cursor()
        
        cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
        row = cur.fetchone()
        if not row:
            return defaults
        line_id = row[0]
        
        cur.execute("""
            SELECT 
                (SELECT COUNT(DISTINCT machine_id) FROM dbo.machine_line WHERE line_id = ? AND is_active = 1) AS total_machines,
                (SELECT COUNT(DISTINCT sparepart_id) FROM dbo.sparepart_line_mapping WHERE line_id = ? AND is_active = 1) AS compatible_parts,
                (SELECT COUNT(DISTINCT sparepart_id) FROM dbo.sparepart_line_mapping WHERE line_id = ? AND is_active = 1 AND approved = 0) AS pending_review,
                (SELECT AVG(CAST(confidence_score AS FLOAT)) FROM dbo.sparepart_line_mapping WHERE line_id = ? AND is_active = 1) AS avg_confidence
        """, (line_id, line_id, line_id, line_id))
        res = cur.fetchone()
        total_machines = res[0] or 0
        compatible_parts = res[1] or 0
        pending_review = res[2] or 0
        avg_confidence = res[3] or 0.0
        
        cur.execute("""
            SELECT 
                SUM(bk.qty) as qty,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as cost
            FROM dbo.Barang_Keluar bk
            JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
            WHERE ml.line_id = ? AND ml.is_active = 1
              AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
              AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
              AND YEAR(bk.tanggal) = YEAR(GETDATE())
        """, (line_id,))
        res_usage = cur.fetchone()
        monthly_qty = float(res_usage[0] or 0) if res_usage else 0.0
        monthly_cost = float(res_usage[1] or 0) if res_usage else 0.0
        
        return {
            "total_machines": total_machines,
            "compatible_parts": compatible_parts,
            "monthly_qty": monthly_qty,
            "monthly_cost": monthly_cost,
            "pending_review": pending_review,
            "avg_confidence": avg_confidence
        }

    def get_line_compatible_parts(self, line_code: str, search: str = None, category: str = None, source: str = None, status: str = None) -> list:
        """Loads detailed compatible sparepart list for the selected line."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        
        cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
        row = cur.fetchone()
        if not row:
            return []
        line_id = row[0]
        
        query = """
            SELECT 
                md.id,
                md.bin,
                md.item,
                md.category,
                md.current_stock,
                md.current_unit_price AS current_price,
                slm.created_at AS compatible_since,
                slm.confidence_score,
                slm.mapping_source,
                slm.approved,
                slm.is_active,
                slm.id AS mapping_id
            FROM dbo.sparepart_line_mapping slm
            JOIN dbo.Master_Data md ON slm.sparepart_id = md.id
            WHERE slm.line_id = ?
        """
        params = [line_id]
        
        if search:
            like = f"%{search}%"
            query += " AND (md.id LIKE ? OR md.bin LIKE ? OR md.item LIKE ?)"
            params.extend([like, like, like])
        if category and category != "All":
            query += " AND md.category = ?"
            params.append(category)
        if source and source != "All":
            query += " AND slm.mapping_source = ?"
            params.append(source)
        if status and status != "All":
            if status == "Approved":
                query += " AND slm.approved = 1 AND slm.is_active = 1"
            elif status == "Pending":
                query += " AND slm.approved = 0 AND slm.is_active = 1"
            elif status == "Inactive":
                query += " AND slm.is_active = 0"
               
        query += " ORDER BY md.bin ASC"
        cur.execute(query, params)
        rows = self._sql_rows_to_dicts(cur)
        
        enriched = []
        for r in rows:
            sp_id = r["id"]
            
            # 1. Compatible machines (from Sparepart_Machine_Usage)
            cur.execute("""
                SELECT DISTINCT mm.machine_code 
                FROM dbo.Sparepart_Machine_Usage smu
                JOIN dbo.Machine_Master mm ON smu.machine_id = mm.id
                JOIN dbo.machine_line ml ON mm.id = ml.machine_id
                WHERE smu.master_data_id = ? AND ml.line_id = ? AND smu.is_active = 1 AND ml.is_active = 1
            """, (sp_id, line_id))
            comp_machs = [row[0] for row in cur.fetchall() if row[0]]
            r["compatible_machines"] = ", ".join(comp_machs) if comp_machs else "-"
            
            # 2. Installed machines (from Barang_Keluar)
            cur.execute("""
                SELECT DISTINCT mm.machine_code 
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                JOIN dbo.machine_line ml ON mm.id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1 AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            """, (sp_id, line_id))
            inst_machs = [row[0] for row in cur.fetchall() if row[0]]
            r["installed_machines"] = ", ".join(inst_machs) if inst_machs else "-"
            
            # 3. Monthly usage stats
            cur.execute("""
                SELECT 
                    SUM(bk.qty) as qty,
                    SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE bk.master_data_id = ? AND ml.line_id = ? AND ml.is_active = 1
                  AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())
            """, (sp_id, line_id))
            usage_res = cur.fetchone()
            r["monthly_usage"] = float(usage_res[0] or 0) if usage_res else 0.0
            r["monthly_cost"] = float(usage_res[1] or 0) if usage_res else 0.0
            
            src = r["mapping_source"] or "MANUAL"
            if src == "AUTO":
                r["source_display"] = "Auto Learned"
            elif src == "AI":
                r["source_display"] = "AI Recommendation"
            else:
                r["source_display"] = "Manual"
                
            if not r["is_active"]:
                r["status_display"] = "Inactive"
            elif r["approved"] == 1:
                r["status_display"] = "Approved"
            else:
                r["status_display"] = "Pending"
                
            enriched.append(r)
        return enriched

    def get_compatibility_matrix(self, line_code: str) -> dict:
        """Retrieves grid data representing Machine vs Spareparts mappings for the selected line."""
        if not self.sql_conn:
            return {"machines": [], "spareparts": [], "matrix": {}}
        cur = self._cursor()
        
        cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
        row = cur.fetchone()
        if not row:
            return {"machines": [], "spareparts": [], "matrix": {}}
        line_id = row[0]
        
        cur.execute("""
            SELECT DISTINCT mm.id, mm.machine_code, mm.machine_name 
            FROM dbo.Machine_Master mm
            JOIN dbo.machine_line ml ON mm.id = ml.machine_id
            WHERE ml.line_id = ? AND ml.is_active = 1 AND mm.status = 'active'
            ORDER BY mm.machine_code ASC
        """, (line_id,))
        machines = [{"id": r[0], "code": r[1], "name": r[2]} for r in cur.fetchall()]
        
        cur.execute("""
            SELECT DISTINCT md.id, md.bin, md.item 
            FROM dbo.sparepart_line_mapping slm
            JOIN dbo.Master_Data md ON slm.sparepart_id = md.id
            WHERE slm.line_id = ? AND slm.is_active = 1
            ORDER BY md.bin ASC
        """, (line_id,))
        spareparts = [{"id": r[0], "bin": r[1], "name": r[2]} for r in cur.fetchall()]
        
        cur.execute("""
            SELECT smu.master_data_id, smu.machine_id 
            FROM dbo.Sparepart_Machine_Usage smu
            JOIN dbo.machine_line ml ON smu.machine_id = ml.machine_id
            WHERE ml.line_id = ? AND smu.is_active = 1 AND ml.is_active = 1
        """, (line_id,))
        mappings = cur.fetchall()
        mapping_set = {(m[0], m[1]) for m in mappings}
        
        matrix = {}
        for sp in spareparts:
            sp_id = sp["id"]
            matrix[sp_id] = {}
            for m in machines:
                m_id = m["id"]
                matrix[sp_id][m_id] = (sp_id, m_id) in mapping_set
                
        return {
            "machines": machines,
            "spareparts": spareparts,
            "matrix": matrix
        }

    def get_global_compatibility_summary(self) -> dict:
        """Fetch global compatibility metrics for the dashboard's right panel."""
        defaults = {"total_spareparts": 0, "total_machines": 0, "manual": 0, "auto": 0, "pending": 0, "rejected": 0, "avg_confidence": 0.0, "last_updated": "-"}
        if not self.sql_conn:
            return defaults
        cur = self._cursor()
        
        cur.execute("""
            SELECT 
                (SELECT COUNT(DISTINCT sparepart_id) FROM dbo.sparepart_line_mapping WHERE is_active = 1) as total_sp,
                (SELECT COUNT(*) FROM dbo.Machine_Master WHERE status = 'active') as total_mac,
                (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'MANUAL' AND is_active = 1) as manual,
                (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'AUTO' AND is_active = 1) as auto,
                (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE approved = 0 AND is_active = 1) as pending,
                (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE is_active = 0) as rejected,
                (SELECT AVG(CAST(confidence_score AS FLOAT)) FROM dbo.sparepart_line_mapping WHERE is_active = 1) as avg_conf,
                (SELECT MAX(updated_at) FROM dbo.sparepart_line_mapping) as last_up
        """)
        row = cur.fetchone()
        if not row:
            return defaults
            
        last_updated_str = "-"
        if row[7]:
            last_updated_str = row[7].strftime("%d %b %Y %H:%M")
            
        return {
            "total_spareparts": row[0] or 0,
            "total_machines": row[1] or 0,
            "manual": row[2] or 0,
            "auto": row[3] or 0,
            "pending": row[4] or 0,
            "rejected": row[5] or 0,
            "avg_confidence": row[6] or 0.0,
            "last_updated": last_updated_str
        }

    def get_top_compatibility_parts(self, limit=10) -> list:
        """Loads Top 10 most used spareparts and their total costs."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute(f"""
            SELECT TOP {limit}
                md.id,
                md.bin,
                md.item,
                COUNT(bk.id) as usage_count,
                SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as total_cost
            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            GROUP BY md.id, md.bin, md.item
            ORDER BY total_cost DESC
        """)
        rows = self._sql_rows_to_dicts(cur)
        
        for r in rows:
            sp_id = r["id"]
            cur.execute("""
                SELECT DISTINCT mm.machine_code 
                FROM dbo.Sparepart_Machine_Usage smu
                JOIN dbo.Machine_Master mm ON smu.machine_id = mm.id
                WHERE smu.master_data_id = ? AND smu.is_active = 1
            """, (sp_id,))
            machs = [row[0] for row in cur.fetchall() if row[0]]
            r["compatible_machines"] = ", ".join(machs) if machs else "-"
            
        return rows

    def add_machine_mapping_relation(self, sparepart_id: str, machine_id: int) -> bool:
        """Add or reactivate a machine-to-sparepart mapping relation."""
        if not self.sql_conn:
            return False
        try:
            cur = self._cursor()
            cur.execute("""
                SELECT id FROM dbo.Sparepart_Machine_Usage 
                WHERE master_data_id = ? AND machine_id = ?
            """, (sparepart_id, machine_id))
            row = cur.fetchone()
            if row:
                cur.execute("""
                    UPDATE dbo.Sparepart_Machine_Usage 
                    SET is_active = 1, approved = 1, updated_at = GETDATE()
                    WHERE id = ?
                """, (row[0],))
            else:
                cur.execute("""
                    INSERT INTO dbo.Sparepart_Machine_Usage 
                        (master_data_id, machine_id, qty_need_year, safety_stock, criticality, mapping_source, usage_count, last_used_at, approved, is_active)
                    VALUES (?, ?, 0, 0, 'medium', 'MANUAL', 1, GETDATE(), 1, 1)
                """, (sparepart_id, machine_id))
            self._commit()
            return True
        except Exception as ex:
            log.error("add_machine_mapping_relation failed: %s", ex)
            return False

    def deactivate_machine_mapping_relation(self, sparepart_id: str, machine_id: int) -> bool:
        """Soft-deletes a machine-to-sparepart mapping relation."""
        if not self.sql_conn:
            return False
        try:
            cur = self._cursor()
            cur.execute("""
                UPDATE dbo.Sparepart_Machine_Usage 
                SET is_active = 0, updated_at = GETDATE()
                WHERE master_data_id = ? AND machine_id = ?
            """, (sparepart_id, machine_id))
            self._commit()
            return True
        except Exception as ex:
            log.error("deactivate_machine_mapping_relation failed: %s", ex)
            return False

    # ═══════════════════════════════════════════════════════════════════════════
    # ENTERPRISE SPAREPART INTELLIGENCE HUB — ADVANCED METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def get_production_line_health_explorer(self) -> list:
        """Retrieves aggregated explorer metrics with calculated health status for each line."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("""
            SELECT id, line_code, line_name, status FROM dbo.master_line WHERE status = 'active' ORDER BY line_code ASC
        """)
        lines = self._sql_rows_to_dicts(cur)
        
        result = []
        for ln in lines:
            l_id = ln["id"]
            l_code = ln["line_code"]
            
            # 1. Total Machines
            cur.execute("SELECT COUNT(DISTINCT machine_id) FROM dbo.machine_line WHERE line_id = ? AND is_active = 1", (l_id,))
            total_machines = cur.fetchone()[0] or 0
            
            # 2. Compatible Parts
            cur.execute("SELECT COUNT(DISTINCT sparepart_id) FROM dbo.sparepart_line_mapping WHERE line_id = ? AND is_active = 1", (l_id,))
            total_spareparts = cur.fetchone()[0] or 0
            
            # 3. Pending Review
            cur.execute("SELECT COUNT(DISTINCT sparepart_id) FROM dbo.sparepart_line_mapping WHERE line_id = ? AND is_active = 1 AND approved = 0", (l_id,))
            pending_review = cur.fetchone()[0] or 0
            
            # 4. Monthly usage and cost (current month)
            cur.execute("""
                SELECT 
                    SUM(bk.qty) as qty,
                    SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0))))) as cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1
                  AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
                  AND YEAR(bk.tanggal) = YEAR(GETDATE())
            """, (l_id,))
            usage_res = cur.fetchone()
            monthly_consumption = float(usage_res[0] or 0)
            monthly_cost = float(usage_res[1] or 0)
            
            # 5. Last Activity
            cur.execute("""
                SELECT MAX(tanggal) FROM dbo.Barang_Keluar bk
                JOIN dbo.machine_line ml ON bk.machine_id = ml.machine_id
                WHERE ml.line_id = ? AND ml.is_active = 1 AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            """, (l_id,))
            last_act = cur.fetchone()[0]
            last_activity_str = last_act.strftime("%Y-%m-%d %H:%M:%S") if last_act else "-"
            
            # 6. Calculate Health Status dynamically
            if monthly_cost >= 100000000 or pending_review > 10:
                health = "Critical"
            elif pending_review > 2 or monthly_cost >= 50000000:
                health = "Warning"
            else:
                health = "Healthy"
               
            result.append({
                "line_code": l_code,
                "area": "UP1",
                "total_machines": total_machines,
                "compatible_parts": total_spareparts,
                "monthly_cost": monthly_cost,
                "monthly_consumption": monthly_consumption,
                "pending_review": pending_review,
                "health_status": health,
                "last_activity": last_activity_str
            })
        return result

    def get_machines_with_kpis_for_line(self, line_code: str, search: str = None, status: str = None, machine_type: str = None, manufacturer: str = None) -> list:
        """Loads machines mapped to the selected line with computed KPIs and health score."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        
        cur.execute("SELECT id FROM dbo.master_line WHERE line_code = ?", (line_code,))
        row = cur.fetchone()
        if not row:
            return []
        line_id = row[0]
        
        query = """
            SELECT 
                mm.id,
                mm.machine_code,
                mm.machine_name,
                mm.status,
                mm.machine_type,
                mm.manufacturer,
                mm.model,
                mm.created_at AS installation_date
            FROM dbo.Machine_Master mm
            JOIN dbo.machine_line ml ON mm.id = ml.machine_id
            WHERE ml.line_id = ? AND ml.is_active = 1
        """
        params = [line_id]
        
        if search:
            like = f"%{search}%"
            query += " AND (mm.machine_code LIKE ? OR mm.machine_name LIKE ?)"
            params.extend([like, like])
        if status and status != "All":
            query += " AND mm.status = ?"
            params.append(status)
        if machine_type and machine_type != "All":
            query += " AND mm.machine_type = ?"
            params.append(machine_type)
        if manufacturer and manufacturer != "All":
            query += " AND mm.manufacturer = ?"
            params.append(manufacturer)
            
        query += " ORDER BY mm.machine_code ASC"
        cur.execute(query, params)
        rows = self._sql_rows_to_dicts(cur)
        
        result = []
        for r in rows:
            m_id = r["id"]
            
            # 1. Compatible Parts count
            cur.execute("SELECT COUNT(DISTINCT master_data_id) FROM dbo.Sparepart_Machine_Usage WHERE machine_id = ? AND is_active = 1", (m_id,))
            parts_count = cur.fetchone()[0] or 0
            
            # 2. Monthly cost (current month)
            cur.execute("""
                SELECT SUM(ISNULL(bk.Total_Cost, ISNULL(bk.total_cost_snapshot, bk.qty * ISNULL(bk.Unit_Price, ISNULL(bk.unit_price_snapshot, 0)))))
                FROM dbo.Barang_Keluar bk
                WHERE bk.machine_id = ? 
                  AND MONTH(bk.tanggal) = MONTH(GETDATE()) 
                  AND YEAR(bk.tanggal) = YEAR(GETDATE())
            """, (m_id,))
            m_cost = float(cur.fetchone()[0] or 0)
            
            # 3. Avg Confidence score of mappings
            cur.execute("SELECT AVG(CAST(confidence_score AS FLOAT)) FROM dbo.Sparepart_Machine_Usage WHERE machine_id = ? AND is_active = 1", (m_id,))
            avg_conf = float(cur.fetchone()[0] or 0.0)
            if avg_conf == 0.0:
                avg_conf = 95.0
               
            if m_cost > 30000000:
                health = "Critical"
            elif m_cost > 10000000:
                health = "Warning"
            else:
                health = "Healthy"
               
            r.update({
                "compatible_parts_count": parts_count,
                "monthly_cost": m_cost,
                "avg_confidence": avg_conf,
                "health_status": health
            })
            result.append(r)
        return result

    def get_spareparts_by_machine_with_usage(self, machine_id: int) -> list:
        """Fetches detailed compatible sparepart rows for the selected machine with stock and intervals."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("""
            SELECT 
                smu.id AS mapping_id,
                smu.confidence_score,
                smu.mapping_source,
                smu.approved,
                smu.is_active,
                md.id,
                md.bin,
                md.item,
                md.category,
                md.current_stock
            FROM dbo.Sparepart_Machine_Usage smu
            JOIN dbo.Master_Data md ON smu.master_data_id = md.id
            WHERE smu.machine_id = ? AND smu.is_active = 1
            ORDER BY md.bin ASC
        """, (machine_id,))
        rows = self._sql_rows_to_dicts(cur)
        
        result = []
        for r in rows:
            sp_id = r["id"]
            
            # 1. Installed Quantity
            cur.execute("SELECT qty_need_year FROM dbo.Sparepart_Machine_Usage WHERE master_data_id = ? AND machine_id = ? AND is_active = 1", (sp_id, machine_id))
            row = cur.fetchone()
            installed_qty = float(row[0] or 1.0) if row else 1.0
            
            # 2. Monthly usage and cost (current month)
            cur.execute("""
                SELECT 
                    SUM(qty) as qty,
                    SUM(ISNULL(Total_Cost, ISNULL(total_cost_snapshot, qty * ISNULL(Unit_Price, ISNULL(unit_price_snapshot, 0))))) as cost
                FROM dbo.Barang_Keluar
                WHERE master_data_id = ? AND machine_id = ?
                  AND MONTH(tanggal) = MONTH(GETDATE()) AND YEAR(tanggal) = YEAR(GETDATE())
            """, (sp_id, machine_id))
            usage_res = cur.fetchone()
            monthly_usage = float(usage_res[0] or 0.0)
            monthly_cost = float(usage_res[1] or 0.0)
            
            # 3. Average Replacement Interval
            cur.execute("""
                SELECT tanggal FROM dbo.Barang_Keluar
                WHERE master_data_id = ? AND machine_id = ?
                ORDER BY tanggal ASC
            """, (sp_id, machine_id))
            dates = [row[0] for row in cur.fetchall() if row[0]]
            if len(dates) >= 2:
                intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
                avg_interval = f"{sum(intervals) / len(intervals):.1f} Days"
            else:
                avg_interval = "180 Days"
               
            r.update({
                "installed_qty": installed_qty,
                "monthly_usage": monthly_usage,
                "monthly_cost": monthly_cost,
                "avg_replacement_interval": avg_interval,
                "status_display": "Approved" if r["approved"] == 1 else "Pending"
            })
            result.append(r)
        return result

    def get_machine_overview_stats(self, machine_id: int) -> dict:
        """Calculates highlights for the selected machine's Overview tab."""
        defaults = {"top_cost_part": "-", "frequent_replaced": "-", "oldest_installed": "-", "most_expensive": "-", "health_score": "98%"}
        if not self.sql_conn:
            return defaults
        cur = self._cursor()
        
        # 1. Top Cost Part
        cur.execute("""
            SELECT TOP 1 md.item
            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            GROUP BY md.item
            ORDER BY SUM(ISNULL(bk.Total_Cost, bk.qty * ISNULL(bk.Unit_Price, 0))) DESC
        """, (machine_id,))
        row1 = cur.fetchone()
        top_cost = row1[0] if row1 else "-"
        
        # 2. Most Frequently Replaced
        cur.execute("""
            SELECT TOP 1 md.item
            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            GROUP BY md.item
            ORDER BY COUNT(bk.id) DESC
        """, (machine_id,))
        row2 = cur.fetchone()
        freq_rep = row2[0] if row2 else "-"
        
        # 3. Oldest Installed Sparepart
        cur.execute("""
            SELECT TOP 1 md.item
            FROM dbo.Sparepart_Machine_Usage smu
            JOIN dbo.Master_Data md ON smu.master_data_id = md.id
            WHERE smu.machine_id = ? AND smu.is_active = 1
            ORDER BY smu.created_at ASC
        """, (machine_id,))
        row3 = cur.fetchone()
        oldest = row3[0] if row3 else "-"
        
        # 4. Most Expensive Sparepart
        cur.execute("""
            SELECT TOP 1 md.item
            FROM dbo.Sparepart_Machine_Usage smu
            JOIN dbo.Master_Data md ON smu.master_data_id = md.id
            WHERE smu.machine_id = ? AND smu.is_active = 1
            ORDER BY md.current_unit_price DESC
        """, (machine_id,))
        row4 = cur.fetchone()
        expensive = row4[0] if row4 else "-"
        
        return {
            "top_cost_part": top_cost,
            "frequent_replaced": freq_rep,
            "oldest_installed": oldest,
            "most_expensive": expensive,
            "health_score": "96%"
        }

    def get_machine_transactions(self, machine_id: int) -> list:
        """Retrieves combined transactions for the selected machine."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        cur.execute("""
            SELECT TOP 30
                bk.id,
                bk.tanggal as transaction_date,
                md.item as sparepart_name,
                bk.qty,
                ISNULL(bk.Total_Cost, bk.qty * ISNULL(bk.Unit_Price, 0)) as total_cost,
                'Barang Keluar' as transaction_type
            FROM dbo.Barang_Keluar bk
            JOIN dbo.Master_Data md ON bk.master_data_id = md.id
            WHERE bk.machine_id = ?
            ORDER BY bk.tanggal DESC
        """, (machine_id,))
        return self._sql_rows_to_dicts(cur)

    def delete_compatibility(self, mapping_type: str, mapping_id: int) -> bool:
        """Permanently deletes a compatibility mapping from the database."""
        if not self.sql_conn:
            return False
        try:
            cur = self._cursor()
            if mapping_type == "line":
                cur.execute("DELETE FROM dbo.sparepart_line_mapping WHERE id = ?", (mapping_id,))
            else:
                cur.execute("DELETE FROM dbo.Sparepart_Machine_Usage WHERE id = ?", (mapping_id,))
            self._commit()
            return True
        except Exception as ex:
            log.error("delete_compatibility failed type=%s id=%s: %s", mapping_type, mapping_id, ex)
            return False

    def bulk_assign_machine_compatibility(self, sparepart_id: str, machine_ids: list) -> bool:
        """Assigns multiple machines to a single sparepart, creating new or updating existing mappings."""
        if not self.sql_conn:
            return False
        try:
            cur = self._cursor()
            for machine_id in machine_ids:
                cur.execute("""
                    SELECT id FROM dbo.Sparepart_Machine_Usage 
                    WHERE master_data_id = ? AND machine_id = ?
                """, (sparepart_id, machine_id))
                row = cur.fetchone()
                if row:
                    cur.execute("""
                        UPDATE dbo.Sparepart_Machine_Usage 
                        SET is_active = 1, approved = 1, updated_at = GETDATE()
                        WHERE id = ?
                    """, (row[0],))
                else:
                    cur.execute("""
                        INSERT INTO dbo.Sparepart_Machine_Usage 
                            (master_data_id, machine_id, qty_need_year, safety_stock, criticality, mapping_source, usage_count, last_used_at, approved, is_active)
                        VALUES (?, ?, 0, 0, 'medium', 'MANUAL', 1, GETDATE(), 1, 1)
                    """, (sparepart_id, machine_id))
            self._commit()
            return True
        except Exception as ex:
            log.error("bulk_assign_machine_compatibility failed: %s", ex)
            return False

    def get_compatibility_statistics(self) -> dict:
        """Fetch all operational compatibility metrics directly from SQL queries."""
        if not self.sql_conn:
            return {}
        cur = self._cursor()
        try:
            # 1. Total Compatible Lines
            cur.execute("SELECT COUNT(DISTINCT line_id) FROM dbo.sparepart_line_mapping WHERE is_active = 1")
            total_lines = cur.fetchone()[0] or 0

            # 2. Total Compatible Machines
            cur.execute("SELECT COUNT(DISTINCT machine_id) FROM dbo.Sparepart_Machine_Usage WHERE is_active = 1")
            total_machines = cur.fetchone()[0] or 0

            # 3. Total Compatible Spareparts
            cur.execute("""
                SELECT COUNT(DISTINCT sp_id) FROM (
                    SELECT sparepart_id AS sp_id FROM dbo.sparepart_line_mapping WHERE is_active = 1
                    UNION
                    SELECT master_data_id AS sp_id FROM dbo.Sparepart_Machine_Usage WHERE is_active = 1
                ) t
            """)
            total_spareparts = cur.fetchone()[0] or 0

            # 4. Pending Mapping
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE approved = 0 AND is_active = 1) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE approved = 0 AND is_active = 1)
            """)
            pending_mapping = cur.fetchone()[0] or 0

            # 5. Manual Mapping
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'MANUAL' AND is_active = 1) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE mapping_source = 'MANUAL' AND is_active = 1)
            """)
            manual_mapping = cur.fetchone()[0] or 0

            # 6. Auto Created Mapping
            cur.execute("""
                SELECT 
                    (SELECT COUNT(*) FROM dbo.sparepart_line_mapping WHERE mapping_source = 'AUTO' AND is_active = 1) +
                    (SELECT COUNT(*) FROM dbo.Sparepart_Machine_Usage WHERE mapping_source = 'AUTO' AND is_active = 1)
            """)
            auto_mapping = cur.fetchone()[0] or 0

            # 7. Monthly Compatibility Growth (last 6 months)
            cur.execute("""
                SELECT TOP 6
                    YEAR(created_at) as yr, 
                    MONTH(created_at) as mth, 
                    COUNT(*) as cnt 
                FROM (
                    SELECT created_at FROM dbo.sparepart_line_mapping WHERE is_active = 1
                    UNION ALL
                    SELECT created_at FROM dbo.Sparepart_Machine_Usage WHERE is_active = 1
                ) t
                GROUP BY YEAR(created_at), MONTH(created_at)
                ORDER BY yr DESC, mth DESC
            """)
            growth_raw = cur.fetchall()
            growth = []
            months_lbl = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            for r in reversed(growth_raw):
                growth.append({
                    "label": f"{months_lbl[int(r[1])-1]} {r[0]}",
                    "value": int(r[2])
                })

            # 8. Top Compatible Spareparts
            cur.execute("""
                SELECT TOP 5 md.bin, md.item, COUNT(*) as mappings_count
                FROM (
                    SELECT sparepart_id as sp_id FROM dbo.sparepart_line_mapping WHERE is_active = 1
                    UNION ALL
                    SELECT master_data_id as sp_id FROM dbo.Sparepart_Machine_Usage WHERE is_active = 1
                ) t
                JOIN dbo.Master_Data md ON t.sp_id = md.id
                GROUP BY md.bin, md.item
                ORDER BY mappings_count DESC
            """)
            top_spareparts = [{"bin": r[0], "item": r[1], "count": int(r[2])} for r in cur.fetchall()]

            # 9. Top Compatible Lines
            cur.execute("""
                SELECT TOP 5 ml.line_code, COUNT(*) as mappings_count
                FROM dbo.sparepart_line_mapping slm
                JOIN dbo.master_line ml ON slm.line_id = ml.id
                WHERE slm.is_active = 1
                GROUP BY ml.line_code
                ORDER BY mappings_count DESC
            """)
            top_lines = [{"line_code": r[0], "count": int(r[1])} for r in cur.fetchall()]

            # 10. Most Used Spareparts
            cur.execute("""
                SELECT TOP 5 md.bin, md.item, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                GROUP BY md.bin, md.item
                ORDER BY usage_count DESC
            """)
            most_used_spareparts = [{"bin": r[0], "item": r[1], "count": int(r[2])} for r in cur.fetchall()]

            # 11. Most Used Machines
            cur.execute("""
                SELECT TOP 5 mm.machine_code, mm.machine_name, COUNT(*) as usage_count
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY usage_count DESC
            """)
            most_used_machines = [{"machine_code": r[0], "machine_name": r[1], "count": int(r[2])} for r in cur.fetchall()]

            # 12. Highest Monthly Cost (Per Machine)
            cur.execute("""
                SELECT TOP 5 mm.machine_code, mm.machine_name, SUM(ISNULL(bk.Total_Cost, bk.qty * ISNULL(bk.Unit_Price, 0))) as total_cost
                FROM dbo.Barang_Keluar bk
                JOIN dbo.Machine_Master mm ON bk.machine_id = mm.id
                WHERE (bk.approval_status IS NULL OR bk.approval_status = 'approved') AND MONTH(bk.tanggal) = MONTH(GETDATE()) AND YEAR(bk.tanggal) = YEAR(GETDATE())
                GROUP BY mm.machine_code, mm.machine_name
                ORDER BY total_cost DESC
            """)
            highest_monthly_cost = [{"machine_code": r[0], "machine_name": r[1], "cost": float(r[2])} for r in cur.fetchall()]

            return {
                "total_lines": total_lines,
                "total_machines": total_machines,
                "total_spareparts": total_spareparts,
                "pending_mapping": pending_mapping,
                "manual_mapping": manual_mapping,
                "auto_mapping": auto_mapping,
                "growth": growth,
                "top_spareparts": top_spareparts,
                "top_lines": top_lines,
                "most_used_spareparts": most_used_spareparts,
                "most_used_machines": most_used_machines,
                "highest_monthly_cost": highest_monthly_cost
            }
        except Exception as ex:
            log.error("get_compatibility_statistics failed: %s", ex)
            return {}

    # ==================== Machine Sparepart Mapping Module ====================

    def get_lines_for_machine_filter(self) -> list:
        """Return distinct lines that have at least one active machine, for the cascade dropdown."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        try:
            cur.execute("""
                SELECT DISTINCT m.line
                FROM dbo.Machine_Master m
                WHERE m.status = 'active' AND m.line IS NOT NULL AND m.line != ''
                ORDER BY m.line ASC
            """)
            return [row[0] for row in cur.fetchall() if row[0]]
        except Exception as ex:
            log.error("get_lines_for_machine_filter failed: %s", ex)
            return []

    def get_machine_installed_spareparts(self, machine_id: int) -> list:
        """
        Full installed sparepart list for a machine, with TBM, stock, price,
        monthly usage, monthly cost, and estimated replacement date.
        """
        if not self.sql_conn:
            return []
        cur = self._cursor()
        try:
            # Self-healing: ensure tbm_months and installed_qty columns exist
            cur.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Sparepart_Machine_Usage' AND COLUMN_NAME='tbm_months'
                )
                BEGIN
                    ALTER TABLE dbo.Sparepart_Machine_Usage ADD tbm_months INT NULL DEFAULT 6;
                END
            """)
            cur.execute("""
                IF NOT EXISTS (
                    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME='Sparepart_Machine_Usage' AND COLUMN_NAME='installed_qty'
                )
                BEGIN
                    ALTER TABLE dbo.Sparepart_Machine_Usage ADD installed_qty DECIMAL(10,2) NULL DEFAULT 1;
                END
            """)
            self._commit()
        except Exception:
            pass

        try:
            cur.execute("""
                SELECT
                    smu.id                AS mapping_id,
                    smu.master_data_id,
                    smu.qty_need_year     AS installed_qty_year,
                    ISNULL(smu.installed_qty, smu.qty_need_year) AS installed_qty,
                    ISNULL(smu.tbm_months, 6)  AS tbm_months,
                    smu.criticality,
                    smu.is_active,
                    smu.installation_date,
                    smu.notes,
                    smu.approved,
                    smu.mapping_source,
                    md.id                AS part_number,
                    md.bin               AS bin_location,
                    md.item              AS part_name,
                    md.category,
                    md.current_stock,
                    md.safety_stock,
                    md.brand,
                    ISNULL(md.current_unit_price, 0) AS unit_price
                FROM dbo.Sparepart_Machine_Usage smu
                JOIN dbo.Master_Data md ON smu.master_data_id = md.id
                WHERE smu.machine_id = ?
                ORDER BY md.item ASC
            """, (machine_id,))
            rows = self._sql_rows_to_dicts(cur)

            # Fetch monthly usage from Barang Keluar
            cur.execute("""
                SELECT master_data_id,
                       SUM(qty) AS monthly_qty,
                       COUNT(*) AS tx_count
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
                  AND MONTH(tanggal) = MONTH(GETDATE())
                  AND YEAR(tanggal) = YEAR(GETDATE())
                GROUP BY master_data_id
            """, (machine_id,))
            monthly = {r["master_data_id"]: r for r in self._sql_rows_to_dicts(cur)}

            # Fetch last replacement date
            cur.execute("""
                SELECT master_data_id, MAX(tanggal) AS last_date
                FROM dbo.Barang_Keluar
                WHERE machine_id = ? AND (approval_status IS NULL OR approval_status = 'approved')
                GROUP BY master_data_id
            """, (machine_id,))
            last_dates = {r["master_data_id"]: r["last_date"] for r in self._sql_rows_to_dicts(cur)}

            from datetime import datetime, timedelta
            today = datetime.today()
            result = []
            for r in rows:
                sp_id = r["master_data_id"]
                m_qty = float(monthly.get(sp_id, {}).get("monthly_qty") or 0)
                unit_price = float(r["unit_price"] or 0)
                tbm = int(r["tbm_months"] or 6)
                inst_qty = float(r["installed_qty"] or 1)

                # Estimated replacement date
                inst_date_str = r.get("installation_date")
                est_rep_date = None
                if inst_date_str:
                    try:
                        inst_dt = datetime.strptime(str(inst_date_str)[:10], "%Y-%m-%d")
                        est_rep_date = inst_dt + timedelta(days=tbm * 30)
                    except Exception:
                        pass

                # Status
                if not r["is_active"]:
                    status = "Inactive"
                elif est_rep_date and est_rep_date <= today + timedelta(days=30):
                    status = "Pending Replacement"
                else:
                    status = "Active"

                result.append({
                    "mapping_id":       r["mapping_id"],
                    "part_number":      r["part_number"],
                    "bin_location":     r["bin_location"],
                    "part_name":        r["part_name"],
                    "category":         r["category"] or "Uncategorized",
                    "installed_qty":    inst_qty,
                    "current_stock":    float(r["current_stock"] or 0),
                    "safety_stock":     float(r["safety_stock"] or 0),
                    "unit_price":       unit_price,
                    "tbm_months":       tbm,
                    "installation_date": inst_date_str,
                    "est_replacement_date": est_rep_date.strftime("%Y-%m-%d") if est_rep_date else "-",
                    "monthly_usage":    m_qty,
                    "monthly_cost":     m_qty * unit_price,
                    "last_replacement": last_dates.get(sp_id),
                    "is_active":        bool(r["is_active"]),
                    "status":           status,
                    "notes":            r.get("notes"),
                    "brand":            r.get("brand"),
                    "mapping_source":   r.get("mapping_source", "MANUAL"),
                })
            return result
        except Exception as ex:
            log.error("get_machine_installed_spareparts failed: %s", ex)
            return []

    def get_machine_replacement_history(self, machine_id: int, limit: int = 50) -> list:
        """Replacement history (Barang Keluar) for a specific machine."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        try:
            cur.execute("""
                SELECT TOP (?)
                    bk.tanggal,
                    bk.master_data_id   AS part_number,
                    md.item             AS part_name,
                    bk.qty              AS new_qty,
                    bk.maintenance_type AS reason,
                    bk.pic              AS technician,
                    bk.id               AS reference_number,
                    bk.rem_name         AS remarks,
                    ISNULL(bk.Unit_Price, 0) AS unit_price
                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved') AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
                ORDER BY bk.tanggal DESC
            """, (limit, machine_id))
            return self._sql_rows_to_dicts(cur)
        except Exception as ex:
            log.error("get_machine_replacement_history failed: %s", ex)
            return []

    def get_machine_usage_analysis(self, machine_id: int, year: int = None, month: int = None) -> list:
        """Retrieve sparepart usage records from Barang_Keluar filtered by machine, year, and month."""
        if not self.sql_conn:
            return []
        cur = self._cursor()
        try:
            query = """
                SELECT
                    bk.tanggal,
                    bk.master_data_id   AS part_number,
                    md.item             AS part_name,
                    bk.qty              AS used_qty,
                    bk.pic              AS technician,
                    bk.id               AS reference_number,
                    bk.rem_name         AS remarks,
                    ISNULL(bk.Unit_Price, 0) AS unit_price,
                    ISNULL(bk.Total_Cost, 0) AS total_cost
                FROM dbo.Barang_Keluar bk
                LEFT JOIN dbo.Master_Data md ON bk.master_data_id = md.id
                WHERE bk.machine_id = ? AND (bk.approval_status IS NULL OR bk.approval_status = 'approved')
            """
            params = [machine_id]
            if year is not None:
                query += " AND YEAR(bk.tanggal) = ?"
                params.append(year)
            if month is not None:
                query += " AND MONTH(bk.tanggal) = ?"
                params.append(month)
                
            query += " ORDER BY bk.tanggal DESC"
            cur.execute(query, tuple(params))
            return self._sql_rows_to_dicts(cur)
        except Exception as ex:
            log.error("get_machine_usage_analysis failed: %s", ex)
            return []

    def add_machine_sparepart_mapping(
        self, machine_id: int, sparepart_id: str,
        installed_qty: float = 1.0, tbm_months: int = 6,
        installation_date: str = None, notes: str = None,
        created_by: str = "System"
    ) -> dict:
        """
        Add a new installed sparepart mapping for a machine.
        Returns {"success": True} or {"success": False, "duplicate": True, "mapping_id": X}
        """
        if not self.sql_conn:
            return {"success": False, "error": "No database connection"}
        cur = self._cursor()
        try:
            # Check for existing mapping
            cur.execute("""
                SELECT id, is_active FROM dbo.Sparepart_Machine_Usage
                WHERE master_data_id = ? AND machine_id = ?
            """, (sparepart_id, machine_id))
            row = cur.fetchone()
            if row:
                return {"success": False, "duplicate": True, "mapping_id": row[0], "is_active": row[1]}

            cur.execute("""
                INSERT INTO dbo.Sparepart_Machine_Usage
                    (master_data_id, machine_id, qty_need_year, installed_qty, tbm_months,
                     installation_date, notes, is_active, mapping_source, approved,
                     criticality, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'MANUAL', 1, 'medium', ?)
            """, (sparepart_id, machine_id, installed_qty, installed_qty, tbm_months,
                  installation_date, notes, created_by))
            self._commit()
            return {"success": True}
        except Exception as ex:
            log.error("add_machine_sparepart_mapping failed: %s", ex)
            return {"success": False, "error": str(ex)}

    def update_machine_sparepart_mapping(
        self, mapping_id: int,
        installed_qty: float = None, tbm_months: int = None,
        installation_date: str = None, notes: str = None
    ) -> bool:
        """Update an existing installed sparepart mapping."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            fields = []
            params = []
            if installed_qty is not None:
                fields.append("qty_need_year = ?")
                params.append(installed_qty)
                fields.append("installed_qty = ?")
                params.append(installed_qty)
            if tbm_months is not None:
                fields.append("tbm_months = ?")
                params.append(tbm_months)
            if installation_date is not None:
                fields.append("installation_date = ?")
                params.append(installation_date)
            if notes is not None:
                fields.append("notes = ?")
                params.append(notes)
            if not fields:
                return True
            fields.append("updated_at = GETDATE()")
            params.append(mapping_id)
            sql = f"UPDATE dbo.Sparepart_Machine_Usage SET {', '.join(fields)} WHERE id = ?"
            cur.execute(sql, params)
            self._commit()
            return cur.rowcount > 0
        except Exception as ex:
            log.error("update_machine_sparepart_mapping failed: %s", ex)
            return False

    def remove_machine_sparepart_mapping(self, mapping_id: int) -> bool:
        """Soft-delete: set is_active = 0."""
        if not self.sql_conn:
            return False
        cur = self._cursor()
        try:
            cur.execute("""
                UPDATE dbo.Sparepart_Machine_Usage
                SET is_active = 0, updated_at = GETDATE()
                WHERE id = ?
            """, (mapping_id,))
            self._commit()
            return cur.rowcount > 0
        except Exception as ex:
            log.error("remove_machine_sparepart_mapping failed: %s", ex)
            return False

    def get_sparepart_preview_details(self, master_data_id: str) -> dict:
        """Get preview details for a selected sparepart: stock, price, compatibilities, purchase/usage history, supplier."""
        if not self.sql_conn:
            return {}
        cur = self._cursor()
        try:
            # 1. Core sparepart info
            cur.execute("""
                SELECT id, item, category, bin, current_stock,
                       ISNULL(current_unit_price, ISNULL(unit_price, 0)) AS unit_price, brand
                FROM dbo.Master_Data
                WHERE id = ?
            """, (master_data_id,))
            row = self._sql_rows_to_dicts(cur)
            if not row:
                return {}
            sp = row[0]

            # 2. Compatible lines
            cur.execute("""
                SELECT DISTINCT line_code FROM (
                    SELECT ml.line_code FROM dbo.sparepart_line_mapping slm
                    JOIN dbo.master_line ml ON slm.line_id = ml.id
                    WHERE slm.sparepart_id = ? AND slm.is_active = 1
                    UNION
                    SELECT m.line AS line_code FROM dbo.Sparepart_Machine_Usage smu
                    JOIN dbo.Machine_Master m ON smu.machine_id = m.id
                    WHERE smu.master_data_id = ? AND smu.is_active = 1
                ) t
                WHERE line_code IS NOT NULL AND line_code != ''
            """, (master_data_id, master_data_id))
            lines = [r["line_code"] for r in self._sql_rows_to_dicts(cur)]

            # 3. Compatible machines
            cur.execute("""
                SELECT DISTINCT m.machine_code, m.machine_name
                FROM dbo.Sparepart_Machine_Usage smu
                JOIN dbo.Machine_Master m ON smu.machine_id = m.id
                WHERE smu.master_data_id = ? AND smu.is_active = 1
            """, (master_data_id,))
            machines = [f"{r['machine_code']} ({r['machine_name']})" for r in self._sql_rows_to_dicts(cur)]

            # 4. Last purchase date (from Barang_Masuk)
            cur.execute("SELECT MAX(tanggal) AS last_date FROM dbo.Barang_Masuk WHERE master_data_id = ?", (master_data_id,))
            last_pur = cur.fetchone()
            last_pur_date = last_pur[0] if last_pur else None

            # 5. Last used date (from Barang_Keluar)
            cur.execute("SELECT MAX(tanggal) AS last_date FROM dbo.Barang_Keluar WHERE master_data_id = ?", (master_data_id,))
            last_used = cur.fetchone()
            last_used_date = last_used[0] if last_used else None

            # 6. Supplier (cheapest supplier offer or fallback to master brand)
            cur.execute("""
                SELECT TOP 1 supplier_name FROM dbo.Supplier_Offer
                WHERE master_data_id = ? AND price > 0
                ORDER BY price ASC
            """, (master_data_id,))
            off = cur.fetchone()
            supplier = off[0] if off else (sp.get("brand") or "—")

            return {
                "part_number":        sp["id"],
                "part_name":          sp["item"],
                "category":           sp["category"] or "Uncategorized",
                "bin_location":       sp["bin"] or "—",
                "current_stock":      float(sp["current_stock"] or 0),
                "unit_price":         float(sp["unit_price"] or 0),
                "compatible_lines":   lines if lines else ["None"],
                "compatible_machines": machines if machines else ["None"],
                "last_purchase_date": last_pur_date,
                "last_used_date":     last_used_date,
                "supplier":           supplier
            }
        except Exception as ex:
            log.error("get_sparepart_preview_details failed: %s", ex)
            return {}


