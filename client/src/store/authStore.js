// store/authStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const DEFAULT_PREFS = { theme: "system", accent: "blue" };

export const useAuth = create(
  persist(
    (set, get) => ({
      admin: null,
      preferences: DEFAULT_PREFS,

      // ✅ 1. Initialize the timer state
      sessionExpiresAt: null,

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      login: (data) => {
        const admin = data?.admin ?? data?.payload ?? data ?? null;

        // ✅ 2. Extract the expiration time from the payload
        const sessionExpiresAt =
          data?.sessionExpiresAt ??
          data?.payload?.sessionExpiresAt ??
          admin?.sessionExpiresAt ??
          null;

        const prefs = admin?.preferences
          ? { ...DEFAULT_PREFS, ...admin.preferences }
          : DEFAULT_PREFS;

        // ✅ 3. Save it to state
        set({ admin, preferences: prefs, sessionExpiresAt });

        // 🔥 TAB SYNC: Broadcast the login event to other tabs
        if (admin) {
          const currentUserId = admin._id || admin.id;
          localStorage.setItem(
            "auth_sync",
            JSON.stringify({ id: currentUserId, time: Date.now() }),
          );
        }
      },

      setPreferences: (prefs) => {
        const current = get().preferences || DEFAULT_PREFS;
        const merged = { ...current, ...(prefs || {}) };

        set((state) => ({
          preferences: merged,
          admin: state.admin
            ? { ...state.admin, preferences: merged }
            : state.admin,
        }));
      },

      logout: () => {
        set({
          admin: null,
          preferences: DEFAULT_PREFS,
          // ✅ 4. Clear the timer on logout
          sessionExpiresAt: null,
        });

        localStorage.removeItem("auth");

        // 🔥 TAB SYNC: Broadcast the logout event to other tabs
        localStorage.setItem(
          "auth_sync",
          JSON.stringify({ action: "logout", time: Date.now() }),
        );
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        admin: state.admin, // ✅ FIX: THIS IS THE LINE THAT KEEPS YOU LOGGED IN ON REFRESH!
        preferences: state.preferences,
        sessionExpiresAt: state.sessionExpiresAt,
      }),

      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Auth rehydrate error:", error);
        state?.setHasHydrated(true);
      },
    },
  ),
);
