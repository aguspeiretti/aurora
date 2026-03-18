import { Outlet, Navigate } from "react-router-dom";
import { useAuthContext } from "../providers/AuthProvider";

export function AuthLayout() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F5EFE6" }}
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/app/dashboard" replace />;

  return (
    <div className="min-h-screen flex" style={{ background: "#f9f5ef" }}>
      {/* Left panel — decorativo */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, #5e3b17 0%, #a87030 45%, #2d7a5f 100%)",
        }}
      >
        {/* Banner como fondo con overlay */}
        <img
          src="/og-image.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10 bg-cream-100" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10 bg-cream-100" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 border-2 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-5 border border-white" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20 shrink-0">
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.replaceWith(
                    Object.assign(document.createElement("span"), {
                      className: "text-xl font-semibold text-white",
                      textContent: "A",
                    }),
                  );
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-widest uppercase">
                Aurora
              </h1>
              <p className="text-white/50 text-[10px] tracking-[0.25em] uppercase font-light">
                gestion integral de turnos
              </p>
            </div>
          </div>

          <h2 className="text-5xl font-light mb-4 leading-tight tracking-tight">
            Gestión elegante
            <br />
            para tu negocio
          </h2>
          <p className="text-lg text-white/75 mb-10">
            El sistema todo en uno para centros de estética y bienestar.
          </p>
          <ul className="space-y-3 text-white/65">
            {[
              "Agenda y turnos en tiempo real",
              "CRM de clientas con historial completo",
              "POS, ventas y caja integrados",
              "Paquetes, gift cards y membresías",
              "Notificaciones automáticas por WhatsApp",
              "Reportes y métricas del negocio",
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "#C9A96E" }}
                />
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #a87030, #2d7a5f)",
              }}
            >
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-gray-900">
                Aurora
              </span>
              <span className="ml-2 text-xs text-gray-400 tracking-widest uppercase">
                gestion integral de turnos
              </span>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
