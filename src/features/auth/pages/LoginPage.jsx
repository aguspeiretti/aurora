import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data) {
    setLoading(true);
    try {
      await auth.signIn({ email: data.email, password: data.password });
      // La redirección ocurre automáticamente por AuthProvider + routing
    } catch (err) {
      toast.error(
        err.message?.includes("Invalid")
          ? "Email o contraseña incorrectos"
          : "Error al iniciar sesión. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenida</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ingresá a tu panel de gestión
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="hola@tucentro.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="input-base pl-9 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Ingresar
        </Button>
      </form>
    </div>
  );
}
