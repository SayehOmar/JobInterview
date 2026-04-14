"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { REGISTER_MUTATION } from "@/graphql/auth";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z
    .string()
    .min(2, "First name is required")
    .optional()
    .or(z.literal("")),
  lastName: z
    .string()
    .min(2, "Last name is required")
    .optional()
    .or(z.literal("")),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onToggle: () => void;
}

export function RegisterForm({ onToggle }: RegisterFormProps) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const [registerMutation, { loading }] = useMutation(REGISTER_MUTATION);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError("");
      // Remove empty strings
      const input = {
        email: data.email,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      };

      const result = await registerMutation({
        variables: { input },
      });

      // @ts-ignore
      const { token, user } = result.data.register;
      setAuth(user, token);
    } catch (err: any) {
      setError(
        err.message || "Registration failed. Email may already be in use.",
      );
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Create account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Start exploring French forest data
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              {...register("firstName")}
              placeholder="Jean"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              {...register("lastName")}
              placeholder="Dupont"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all "
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full px-4 py-2.5 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2 hover:opacity-90"
          style={{ backgroundColor: "#0b4a59" }}
        >
          {(loading || isSubmitting) && (
            <Loader2 className="animate-spin" size={18} />
          )}
          Create Account
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <button
          onClick={onToggle}
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
          style={{ color: "#0b4a59" }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
