import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiLock, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import { FORM_VALIDATORS } from '../../../utils/validators.js';

export default function RegisterForm({ onSubmit, loading, error }) {
  const [agreed, setAgreed] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const usernameVal = watch('username');
  const emailVal = watch('email');
  const passwordVal = watch('password');
  const confirmPasswordVal = watch('confirmPassword');

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-400' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-400' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-400' };
  };

  const strength = getPasswordStrength(passwordVal);

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data, setError))} className="space-y-4">
      {error && (
        <div className="p-3 text-xs font-medium text-red-655 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Full Name */}
      <Input
        label="Full Name"
        type="text"
        placeholder="e.g. John Doe"
        icon={<FiUser className="w-4 h-4 text-slate-400" />}
        error={errors.name?.message}
        required
        {...register('name', FORM_VALIDATORS.fullName)}
      />

      {/* Username */}
      <div className="space-y-1">
        <Input
          label="Username"
          type="text"
          placeholder="e.g. johndoe123"
          icon={<FiUser className="w-4 h-4 text-slate-400" />}
          error={errors.username?.message}
          required
          {...register('username', FORM_VALIDATORS.username)}
        />
        {usernameVal && !errors.username && (
          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 pl-1">
            <FiCheckCircle /> Username format is valid
          </span>
        )}
      </div>

      {/* Email Address */}
      <div className="space-y-1">
        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. candidate@example.com"
          icon={<FiMail className="w-4 h-4 text-slate-400" />}
          error={errors.email?.message}
          required
          {...register('email', FORM_VALIDATORS.email)}
        />
        {emailVal && !errors.email && (
          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 pl-1">
            <FiCheckCircle /> Email address is valid
          </span>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Input
          label="Password"
          type="password"
          placeholder="Min 8 chars, 1 uppercase, 1 symbol"
          icon={<FiLock className="w-4 h-4 text-slate-400" />}
          error={errors.password?.message}
          required
          {...register('password', FORM_VALIDATORS.password)}
        />
        {passwordVal && (
          <div className="space-y-1 pl-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>Password Strength:</span>
              <span className={
                strength.score === 3 ? 'text-emerald-500' : strength.score === 2 ? 'text-amber-500' : 'text-red-400'
              }>{strength.label}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${(strength.score / 3) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1">
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-type your password"
          icon={<FiLock className="w-4 h-4 text-slate-400" />}
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === passwordVal || 'Passwords do not match',
          })}
        />
        {confirmPasswordVal && (
          confirmPasswordVal === passwordVal ? (
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 pl-1">
              <FiCheckCircle /> Passwords match
            </span>
          ) : (
            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 pl-1">
              <FiInfo /> Passwords do not match
            </span>
          )
        )}
      </div>

      {/* Terms and conditions agreement checkbox */}
      <div className="flex items-start gap-2.5 pt-2">
        <input
          id="agree-checkbox"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500 focus:ring-2 accent-orange-500"
        />
        <label htmlFor="agree-checkbox" className="text-xs text-slate-500 dark:text-slate-455 font-bold select-none cursor-pointer">
          I agree to the <Link to="/terms" target="_blank" className="text-orange-500 hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-orange-500 hover:underline">Privacy Policy</Link>
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        disabled={!agreed || !isValid}
        className="w-full mt-4 py-2.5 rounded-xl font-bold tracking-wide"
      >
        Create Account
      </Button>
    </form>
  );
}
