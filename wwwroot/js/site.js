// Automatic scroll position preservation across page reloads and tab navigations
(function() {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    function saveScroll() {
        sessionStorage.setItem('scrollPos_' + window.location.pathname, window.scrollY);
    }

    window.addEventListener('beforeunload', saveScroll);
    window.addEventListener('pagehide', saveScroll);

    document.addEventListener('DOMContentLoaded', function() {
        var savedPos = sessionStorage.getItem('scrollPos_' + window.location.pathname);
        if (savedPos !== null) {
            window.scrollTo(0, parseInt(savedPos, 10));
        }

        // Auto-dismiss notification alerts after 5 seconds
        var alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function(alertElem) {
            setTimeout(function() {
                try {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                        var bsAlert = bootstrap.Alert.getOrCreateInstance(alertElem);
                        if (bsAlert) bsAlert.close();
                    } else {
                        alertElem.style.transition = 'opacity 0.5s ease';
                        alertElem.style.opacity = '0';
                        setTimeout(function() { alertElem.remove(); }, 500);
                    }
                } catch (e) {
                    alertElem.remove();
                }
            }, 5000);
        });
    });
})();
