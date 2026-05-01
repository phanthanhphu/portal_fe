/*
  Add this script to the GW2 home page/layout that loads after login.
  It detects the flag created by openItsm.do/openItsm.html before redirecting to login.
  After GW2 login succeeds, it redirects back to the ITSM bridge so GW2 can get SSO params and submit to ITSM.
*/
(function () {
  var AFTER_LOGIN_ITSM_KEY = "YO_AFTER_LOGIN_ITSM";
  var ITSM_BRIDGE_URL = "/groupware/pnPortal/openItsm.do";

  function hasPendingItsmOpen() {
    try {
      return sessionStorage.getItem(AFTER_LOGIN_ITSM_KEY) === "Y";
    } catch (e) {
      return false;
    }
  }

  function clearPendingItsmOpen() {
    try {
      sessionStorage.removeItem(AFTER_LOGIN_ITSM_KEY);
    } catch (e) {}
  }

  function isGw2LoggedIn() {
    try {
      return !!(window.Common && typeof window.Common.getSession === "function" && window.Common.getSession("USERID"));
    } catch (e) {
      return false;
    }
  }

  function run() {
    if (!hasPendingItsmOpen()) return;

    if (!isGw2LoggedIn()) {
      // Common/session may not be ready yet. Try again briefly.
      setTimeout(run, 500);
      return;
    }

    clearPendingItsmOpen();
    window.location.replace(ITSM_BRIDGE_URL);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(run, 500);
    });
  } else {
    setTimeout(run, 500);
  }
})();
