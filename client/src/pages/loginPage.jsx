import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginEmployee } from "../api/employee";
import { useAuth } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: loginEmployee,
    onSuccess: (data) => {
      login(data); // store admin data in context
      navigate("/dashboard");
    },
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form); // call the mutation
  };

  return (
    <div className="relative size-dvh w-dvw bg-neutral-200">
      <div className="absolute top-[50%] right-[50%] translate-y-[-50%] translate-x-[50%] bg-neutral-50 p-10 rounded-sm">
        <div className="my-4">
          <h1 className="text-3xl font-semibold">Employee Management System</h1>
          <h2 className="text-xl">Login to your Admin Account</h2>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label>Username</label>
            <input
              className="min-w-96  w-full border-1 rounded-sm p-2.5 border-neutral-300 focus:outline-none focus:border-neutral-500"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label>Password</label>
            <input
              className="min-w-96  w-full border-1 rounded-sm p-2.5 border-neutral-300 focus:outline-none focus:border-neutral-500"
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="bg-neutral-700 text-neutral-50 w-full p-3 mt-3 rounded-sm"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        {isError && (
          <p style={{ color: "red" }}>
            {error.response?.data?.message || "Login failed"}
          </p>
        )}
        {isSuccess && <p style={{ color: "green" }}>✅ Login successful</p>}
      </div>
    </div>
  );
};

export default Login;
