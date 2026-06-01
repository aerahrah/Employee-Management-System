import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";

const Forbidden403 = ({
  title = "Access Restricted",
  message,
  employeeType,
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem-1.5rem)] w-full overflow-hidden bg-slate-50 text-slate-600">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full px-4 text-center">
        {/* Floating Icon */}
        <div className="relative inline-block mb-10 group">
          <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 transition-opacity duration-500 group-hover:opacity-30"></div>

          <div className="relative bg-white p-6 rounded-3xl shadow-2xl border border-slate-100">
            <Lock size={64} className="text-red-500" />

            <div className="absolute -top-3 -right-3 bg-red-100 p-2 rounded-full border-4 border-white">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-8xl font-black text-slate-900 mb-2 tracking-tighter">
          4<span className="text-red-500">0</span>3
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
          {title}
        </h2>

        <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg leading-relaxed">
          {message || (
            <>
              This application form is strictly intended for{" "}
              <strong className="text-slate-700">Organic</strong> employees.
              Your current profile is registered as{" "}
              <strong className="text-red-500">
                {employeeType || "Unknown"}
              </strong>
              . You do not have the required permissions to access or submit
              this form.
            </>
          )}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate("/app")}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-slate-900 text-white font-medium rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
          >
            <Home size={18} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden403;
