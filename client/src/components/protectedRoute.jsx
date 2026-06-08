import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { usePermissions } from "../hooks/usePermissions";
import ForbiddenPage from "../pages/forbidden403_GeneralPage";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  // ✅ Added hasHydrated to check if Zustand is done reading local storage
  const { admin, hasHydrated } = useAuth();
  const { can } = usePermissions();

  // ⏳ 1. Wait for Zustand to hydrate before making any routing decisions
  if (!hasHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // 🚪 2. Not logged in (no profile in memory AFTER hydration) → redirect to login
  if (!admin) {
    return <Navigate to="/" replace />;
  }

  // 🛡️ 3. Handle new permission-based system
  if (requiredPermission) {
    if (!can(requiredPermission)) {
      return <ForbiddenPage />;
    }
    return <Outlet />;
  }

  // 🛡️ 4. Logged in but not allowed (legacy role fallback)
  if (allowedRoles) {
    const userRole =
      typeof admin.role === "string" ? admin.role : admin.role?.name;
    if (!allowedRoles.includes(userRole)) {
      return <ForbiddenPage />;
    }
  }

  // ✅ 5. Access Granted!
  return <Outlet />;
};

export default ProtectedRoute;
