// src/components/session/SessionGuard.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogIn, RefreshCw } from "lucide-react";
import Modal from "./modal";
import { useAuth } from "../store/authStore";

export default function SessionGuard() {
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  const sessionExpiresAt = useAuth((s) => s.sessionExpiresAt);
  const admin = useAuth((s) => s.admin);

  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState("login"); // 'login' | 'reload'

  const [expireMessage, setExpireMessage] = useState(
    "Your session has ended for security reasons. Please sign in again to continue.",
  );

  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAction = () => {
    if (actionType === "reload") {
      // Hard refresh to pick up the new user's state from the other tab
      window.location.href = "/";
    } else {
      // Standard expiration: clear state and route to login
      logout();
      setOpen(false);
      navigate("/", { replace: true });
    }
  };

  // 1. Proactive Timer
  useEffect(() => {
    clearTimer();
    setOpen(false);

    if (!sessionExpiresAt) return;

    const msLeft = sessionExpiresAt - Date.now();
    if (msLeft <= 0) {
      setActionType("login");
      setOpen(true);
      return;
    }

    timerRef.current = setTimeout(() => {
      setActionType("login");
      setOpen(true);
    }, msLeft);

    return clearTimer;
  }, [sessionExpiresAt]);

  // 2. Listen for custom API interceptor expiration events
  useEffect(() => {
    const handleSessionExpired = (event) => {
      if (event.detail?.message) {
        setExpireMessage(event.detail.message);
      }
      setActionType("login");
      setOpen(true);
    };

    window.addEventListener("onSessionExpired", handleSessionExpired);
    return () =>
      window.removeEventListener("onSessionExpired", handleSessionExpired);
  }, []);

  // 3. Check Expiration on Window Focus / Visibility Change
  useEffect(() => {
    const recheck = () => {
      if (sessionExpiresAt && Date.now() >= sessionExpiresAt) {
        setActionType("login");
        setOpen(true);
      }
    };

    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);

    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [sessionExpiresAt]);

  // 4. CROSS-TAB SYNCHRONIZATION (Zombie Tab Prevention)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "auth_sync" && e.newValue) {
        const newData = JSON.parse(e.newValue);
        const currentUserId = admin?._id || admin?.id;

        // If another tab fired a logout
        if (newData.action === "logout") {
          setExpireMessage("You have been logged out in another tab.");
          setActionType("login");
          setOpen(true);
          return;
        }

        // If another tab logged in as a DIFFERENT user
        if (currentUserId && newData.id && newData.id !== currentUserId) {
          setExpireMessage(
            "It looks like you logged into a different account in another tab. This tab has been locked to protect your data.",
          );
          setActionType("reload");
          setOpen(true);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [admin]);

  return (
    <Modal
      isOpen={open}
      onClose={() => {}}
      title={null}
      maxWidth="max-w-md"
      showFooter={false}
      closeLabel={null}
      canClose={false}
      preventCloseWhenBusy={true}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
          <Clock className="h-5 w-5 text-gray-500" />
        </div>

        <div className="mt-4 text-lg font-semibold text-gray-900">
          {actionType === "reload" ? "Account Switched" : "Session Expired"}
        </div>

        <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-500">
          {expireMessage}
        </p>

        <div className="my-5 h-px w-full bg-gray-100" />

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleAction}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {actionType === "reload" ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Login again
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
