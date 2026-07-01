import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import { FORM_VALIDATORS } from '../../../utils/validators.js';

export default function PersonalInfoForm({ profile, onSave, saving }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      target_role: '',
      experience_level: '',
      location: '',
      bio: '',
      github_url: '',
      linkedin_url: '',
    }
  });

  // Sync form inputs with profile payload once loaded
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        phone: profile.phone || '',
        target_role: profile.target_role || '',
        experience_level: profile.experience_level || '',
        location: profile.location || '',
        bio: profile.bio || '',
        github_url: profile.github_url || '',
        linkedin_url: profile.linkedin_url || '',
      });
    }
  }, [profile, reset]);

  return (
    <Card hoverable={false} className="space-y-4 text-left bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-850">Personal & Career Settings</h3>
      <p className="text-xs text-slate-400 -mt-1.5 pb-2 font-medium">
        Modify your profile parameters to optimize recommendations
      </p>

      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="e.g. John Doe"
            error={errors.name?.message}
            required
            {...register('name', FORM_VALIDATORS.requiredField('Full Name'))}
          />

          <Input
            label="Target Career Role"
            type="text"
            placeholder="e.g. Frontend Engineer"
            error={errors.target_role?.message}
            required
            {...register('target_role', FORM_VALIDATORS.requiredField('Target role'))}
          />
        </div>

        <div className="flex flex-col space-y-1.5 text-left">
          <label className="text-xs font-bold text-slate-600 uppercase">
            Experience Level
          </label>
          <select
            className={`w-full px-4 py-2.5 rounded-xl text-sm border bg-white outline-none transition-all duration-200 font-medium ${errors.experience_level ? 'border-red-500 text-red-600 focus:border-red-500' : 'text-slate-800 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}`}
            {...register('experience_level')}
          >
            <option value="">Select Experience Level</option>
            <option value="Student">Student</option>
            <option value="Fresher">Fresher</option>
            <option value="Internship">Internship</option>
            <option value="Entry Level (0–2 Years)">Entry Level (0–2 Years)</option>
            <option value="Mid Level (3–5 Years)">Mid Level (3–5 Years)</option>
            <option value="Senior Level (5–8 Years)">Senior Level (5–8 Years)</option>
            <option value="Lead / Architect">Lead / Architect</option>
            <option value="Manager">Manager</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Preferred Location"
            type="text"
            placeholder="e.g. San Francisco or Remote"
            error={errors.location?.message}
            {...register('location')}
          />

          <Input
            label="Phone Number"
            type="text"
            placeholder="e.g. 9876543210"
            error={errors.phone?.message}
            required
            {...register('phone', {
              required: 'Phone number is required',
              pattern: {
                value: /^[0-9]{10}$/,
                message: 'Phone number must contain exactly 10 digits'
              }
            })}
          />
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">
            Professional Summary
          </label>
          <textarea
            placeholder="Introduce yourself to the career counselor..."
            rows={4}
            className={`w-full px-4 py-2.5 rounded-xl text-sm border bg-white placeholder-slate-400 outline-none transition-all duration-200 font-medium ${errors.bio ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'text-slate-800 border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}`}
            {...register('bio', {
              validate: (value) => {
                if (!value || value.trim() === '') return true;
                return value.trim().length >= 20 || 'Professional Summary must be at least 20 characters';
              }
            })}
          />
          {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="GitHub Repository Link"
            type="text"
            placeholder="github.com/username"
            error={errors.github_url?.message}
            {...register('github_url')}
          />

          <Input
            label="LinkedIn Profile URL"
            type="text"
            placeholder="linkedin.com/in/username"
            error={errors.linkedin_url?.message}
            {...register('linkedin_url')}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" loading={saving} className="font-bold">
            Save Parameters
          </Button>
        </div>
      </form>
    </Card>
  );
}
