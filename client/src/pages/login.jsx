import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { loginAdmin } from '../api/admin';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });

  const {
    mutate,
    isPending,
    isSuccess,
    isError,
    error
  } = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      login(data); // store admin data in context
    }
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(form); // call the mutation
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '2rem' }}>
      <h2 className='text-red-500'>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          className='text-red-500'
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <br />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <br />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {isError && <p style={{ color: 'red' }}>{error.response?.data?.message || 'Login failed'}</p>}
      {isSuccess && <p style={{ color: 'green' }}>✅ Login successful</p>}
    </div>
  );
};

export default Login;
