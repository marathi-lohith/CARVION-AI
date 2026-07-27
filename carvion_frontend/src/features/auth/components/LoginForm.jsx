import React from 'react';
import { useForm } from 'react-hook-form';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import { FORM_VALIDATORS } from '../../../utils/validators.js';

export default function LoginForm({ 
  onSubmit, 
  loading, 
  error,
  label = "Username or Email Address",
  placeholder = "e.g. johndoe123 or candidate@example.com",
  icon = <FiUser className="w-4 h-4 text-slate-400" />
}) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({
    defaultValues: {
      usernameOrEmail: '',
      password: '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="p-3 text-xs font-medium text-red-655 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-xl text-center">
          {error}
        </div>
      )}

      <Input
        label={label}
        type="text"
        placeholder={placeholder}
        icon={icon}
        error={errors.usernameOrEmail?.message}
        {...register('usernameOrEmail', FORM_VALIDATORS.requiredField(label))}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your secret password"
        icon={<FiLock className="w-4 h-4 text-slate-400" />}
        error={errors.password?.message}
        {...register('password', FORM_VALIDATORS.password)}
      />

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        className="w-full mt-2 py-2.5 rounded-xl font-bold tracking-wide"
      >
        Sign In
      </Button>
    </form>
  );
}
