import flet as ft


class ColorPalette:
    # ── Brand ─────────────────────────────────────────────────────────────────
    PRIMARY         = "#2563EB"   # Enterprise Blue
    PRIMARY_HOVER   = "#1D4ED8"   # Darker blue on hover
    PRIMARY_LIGHT   = "#DBEAFE"   # Soft light blue

    # ── Sidebar ───────────────────────────────────────────────────────────────
    SIDEBAR_BG      = "#071428"   # Dark navy — sidebar background
    SIDEBAR_HOVER   = "#1E293B"   # Slightly lighter navy on hover
    SIDEBAR_ACTIVE  = "#1E3A5F"   # Active item background
    SIDEBAR_TEXT    = "#94A3B8"   # Inactive icon / text
    SIDEBAR_ACTIVE_TEXT = "#FFFFFF"  # Active item text

    # ── Backgrounds ───────────────────────────────────────────────────────────
    BG_PAGE         = "#F8FAFC"   # Main page background
    BG_LIGHT        = "#F8FAFC"   # Alias
    BG_SURFACE      = "#F1F5F9"   # Table header, toolbar bg
    CARD_BG         = "#FFFFFF"   # Card surfaces

    # ── Text ──────────────────────────────────────────────────────────────────
    TEXT_MAIN       = "#0F172A"   # Primary text
    TEXT_SUB        = "#64748B"   # Secondary / label text
    TEXT_MUTED      = "#94A3B8"   # Placeholder, meta text

    # ── Borders ───────────────────────────────────────────────────────────────
    BORDER          = "#E2E8F0"   # Default border
    BORDER_FOCUS    = "#2563EB"   # Focused input border

    # ── Status ────────────────────────────────────────────────────────────────
    # Muted Enterprise Status Colors
    SUCCESS         = "#15803D"   
    SUCCESS_BG      = "#DCFCE7"
    
    WARNING         = "#B45309"   
    WARNING_BG      = "#FEF3C7"

    ERROR           = "#B91C1C"   # Deep Red for WCAG AA >= 4.5:1 contrast
    ERROR_BG        = "#FEE2E2"

    INFO            = "#1D4ED8"   
    INFO_BG         = "#DBEAFE"

    CRITICAL        = ERROR
    SAFE            = SUCCESS
    NORMAL          = INFO


class AppStyles:
    RADIUS      = 0   # Flat sharp style
    RADIUS_SM   = 0   # Flat sharp style
    RADIUS_LG   = 0   # Flat sharp style

    # ── Card ──────────────────────────────────────────────────────────────────
    @staticmethod
    def card_style(padding=16):
        return {
            "bgcolor": ColorPalette.CARD_BG,
            "border_radius": AppStyles.RADIUS_LG,
            "padding": padding,
            "shadow": ft.BoxShadow(
                blur_radius=3,
                spread_radius=0,
                color=ft.colors.with_opacity(0.05, "#0F172A"),
                offset=ft.Offset(0, 1),
            ),
        }

    # ── Input / TextField ─────────────────────────────────────────────────────
    @staticmethod
    def input_style(label, icon=None, password=False, can_reveal=False):
        style = {
            "label": label,
            "prefix_icon": icon,
            "border_color": ColorPalette.BORDER,
            "focused_border_color": ColorPalette.BORDER_FOCUS,
            "border_radius": AppStyles.RADIUS,
            "text_size": 14,
            "bgcolor": ft.colors.WHITE,
            "content_padding": ft.padding.symmetric(horizontal=12, vertical=12),
            "label_style": ft.TextStyle(color=ColorPalette.TEXT_SUB, size=13),
        }
        if password:
            style["password"] = True
        if can_reveal:
            style["can_reveal_password"] = True
        return style

    # Alias for backward compatibility
    @staticmethod
    def text_field_style(label, icon=None, password=False, can_reveal=False):
        return AppStyles.input_style(label, icon, password, can_reveal)

    # ── Buttons ───────────────────────────────────────────────────────────────
    @staticmethod
    def primary_button():
        """Solid blue button — primary CTA."""
        return ft.ButtonStyle(
            color=ft.colors.WHITE,
            bgcolor=ColorPalette.PRIMARY,
            shape=ft.RoundedRectangleBorder(radius=AppStyles.RADIUS),
            padding=ft.padding.symmetric(horizontal=20, vertical=12),
            elevation=0,
            shadow_color=ft.colors.TRANSPARENT,
        )

    @staticmethod
    def secondary_button_style():
        """Outlined button — secondary action."""
        return ft.ButtonStyle(
            color=ColorPalette.TEXT_SUB,
            bgcolor=ft.colors.WHITE,
            side=ft.BorderSide(1, ColorPalette.BORDER),
            shape=ft.RoundedRectangleBorder(radius=AppStyles.RADIUS),
            padding=ft.padding.symmetric(horizontal=18, vertical=11),
            elevation=0,
            shadow_color=ft.colors.TRANSPARENT,
        )

    @staticmethod
    def ghost_button(color=None):
        """Text-like button with transparent background."""
        c = color or ColorPalette.PRIMARY
        return ft.ButtonStyle(
            color=c,
            bgcolor=ft.colors.TRANSPARENT,
            shape=ft.RoundedRectangleBorder(radius=AppStyles.RADIUS),
            padding=ft.padding.symmetric(horizontal=12, vertical=8),
            elevation=0,
            shadow_color=ft.colors.TRANSPARENT,
        )

    # ── Badges ────────────────────────────────────────────────────────────────
    @staticmethod
    def badge(text: str, text_color: str, bg_color: str) -> ft.Container:
        """Compact status badge / pill."""
        return ft.Container(
            content=ft.Text(
                text,
                size=12,
                weight=ft.FontWeight.W_500,
                color=text_color,
            ),
            bgcolor=bg_color,
            padding=ft.padding.symmetric(horizontal=12, vertical=4),
            border_radius=0,
        )

    # ── Section Header ────────────────────────────────────────────────────────
    @staticmethod
    def section_header(title: str, icon=None) -> ft.Row:
        """Left-accented section header row."""
        controls = [
            ft.Container(
                width=3, height=16,
                bgcolor=ColorPalette.PRIMARY,
                border_radius=0,
            ),
            ft.Text(
                title,
                size=15,
                weight=ft.FontWeight.W_600,
                color=ColorPalette.TEXT_MAIN,
            ),
        ]
        if icon:
            controls.insert(0, ft.Icon(icon, color=ColorPalette.PRIMARY, size=18))
        return ft.Row(controls, spacing=10)
