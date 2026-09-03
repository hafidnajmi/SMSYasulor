"""
main.py - UPMS Application Entry Point
Production-grade: global error handler, structured logging, graceful shutdown.
"""

import flet as ft
import traceback
from database import Database
from views.system_selection_view import SystemSelectionView
from views.login_view import LoginView
from views.main_view import MainView
from views.operator_view import OperatorView
from utils.logger import get_logger
from utils.paths import get_assets_dir
from utils.email_scheduler import start_scheduler, stop_scheduler

log = get_logger("UPMS.Main")


def main(page: ft.Page):
    page.title = "Sparepart Management System"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.theme = ft.Theme(font_family="Segoe UI")
    page.padding = 0

    # Window configuration
    page.window_maximized   = True
    page.window_resizable   = True
    page.window_maximizable = True
    page.window_minimizable = True
    page.window_closable    = True

    # Fallback size if unmaximized (NFT-011 1366x768 & 1080p Responsive Support)
    page.window_width     = 1366
    page.window_height    = 768
    page.window_min_width = 1024
    page.window_min_height= 680

    # ---- Initialize DB ------------------------------------------------------
    try:
        db = Database()
        start_scheduler(db)
        log.info("Application started successfully.")

        # Warning jika debug mode aktif
        if db.config.get("system", {}).get("debug_mode", False):
            log.warning("DEBUG MODE AKTIF — jangan digunakan di production!")
    except Exception as e:
        log.critical("FATAL: Cannot connect to database. %s", e, exc_info=True)
        page.add(
            ft.Container(
                content=ft.Column([
                    ft.Icon(ft.icons.ERROR_OUTLINE, size=64, color=ft.colors.RED_700),
                    ft.Text("Gagal terhubung ke Database!", size=20,
                            weight=ft.FontWeight.BOLD, color=ft.colors.RED_700),
                    ft.Text(str(e), size=13, color=ft.colors.RED_400),
                    ft.Text("Periksa koneksi SQL Server dan config.yaml",
                            size=12, color=ft.colors.GREY_600),
                ], horizontal_alignment=ft.CrossAxisAlignment.CENTER, spacing=12),
                alignment=ft.alignment.center,
                expand=True,
            )
        )
        page.update()
        return

    # ---- Global error handler -----------------------------------------------
    def on_error(e):
        err_msg = str(e.data)
        if "Null check operator used on a null value" in err_msg or "piechart" in err_msg.lower():
            log.warning("Suppressed Flet chart unmount warning on route change: %s", err_msg)
            return
        log.error("Unhandled Flet error: %s", err_msg)
        page.snack_bar = ft.SnackBar(
            ft.Text(f"Terjadi error: {err_msg}", color=ft.colors.WHITE),
            bgcolor=ft.colors.RED_700,
            duration=5000,
        )
        page.snack_bar.open = True
        page.update()

    page.on_error = on_error

    # ---- Window close: clean up DB connections ------------------------------
    def on_window_event(e):
        if e.data == "close":
            log.info("Application closing, releasing DB connections.")
            stop_scheduler()
            db.close()

    page.window_prevent_close = False
    page.on_window_event = on_window_event

    # ---- Routing ------------------------------------------------------------
    def route_change(e: ft.RouteChangeEvent):
        page.views.clear()
        route = page.route

        try:
            if route == "/":
                page.views.append(SystemSelectionView(page, db))
            elif route == "/login":
                page.views.append(LoginView(page, db))
            elif route == "/main":
                page.views.append(MainView(page, db))
            elif route == "/operator":
                page.views.append(OperatorView(page, db))
            else:
                log.warning("Unknown route: %s", route)
                page.views.append(SystemSelectionView(page, db))
        except Exception as ex:
            log.error("Error building view for route %s: %s", route, ex, exc_info=True)

        page.update()

    def view_pop(e: ft.ViewPopEvent):
        if len(page.views) > 1:
            page.views.pop()
            top_view = page.views[-1]
            page.go(top_view.route)

    page.on_route_change = route_change
    page.on_view_pop = view_pop

    # Start at system selection page
    page.go("/")


if __name__ == "__main__":
    import os, sys
    _startup_log_path = os.path.join(os.environ.get("TEMP", os.getcwd()), "upms_debug.log")
    _startup_log = None
    try:
        _startup_log = open(_startup_log_path, "w", encoding="utf-8")
        _startup_log.write(f"frozen={getattr(sys, 'frozen', False)}\n")
        _startup_log.write(f"executable={sys.executable}\n")
        _startup_log.write(f"MEIPASS={getattr(sys, '_MEIPASS', 'N/A')}\n")
        _startup_log.write(f"__file__={__file__}\n")
        _startup_log.write(f"cwd={os.getcwd()}\n")
        _startup_log.write(f"argv={sys.argv}\n")
        _startup_log.flush()

        is_web = os.environ.get("FLET_WEB_MODE") == "1"
        port_num = int(os.environ.get("FLET_PORT", "8550"))

        _startup_log.write("Starting ft.app...\n")
        _startup_log.flush()

        if is_web:
            log.info(f"Starting Flet app in web mode on port {port_num}")
            ft.app(target=main, assets_dir=get_assets_dir(), view=ft.AppView.WEB_BROWSER, port=port_num)
        else:
            ft.app(target=main, assets_dir=get_assets_dir())
    except Exception as e:
        import traceback
        if _startup_log:
            _startup_log.write(f"CRASH: {e}\n")
            _startup_log.write(traceback.format_exc() + "\n")
            _startup_log.close()
        log.critical("Application crashed: %s", e, exc_info=True)
        raise
