import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { FiPlus, FiTrash2, FiBriefcase, FiBookOpen, FiActivity, FiAward, FiUser } from 'react-icons/fi';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import Card from '../../../components/common/Card.jsx';

export default function BuilderForm({ onSubmit, loading }) {
  const [activeTab, setActiveTab] = useState('profile');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: 'My Custom Resume',
      template: 'minimal',
      structured_data: {
        profile: { name: '', email: '', phone: '', bio: '' },
        experiences: [],
        educations: [],
        projects: [],
        skills: [],
        certifications: []
      }
    }
  });

  // Dynamic Array Handlers
  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
    control,
    name: 'structured_data.experiences'
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control,
    name: 'structured_data.educations'
  });

  const { fields: projFields, append: appendProj, remove: removeProj } = useFieldArray({
    control,
    name: 'structured_data.projects'
  });

  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
    control,
    name: 'structured_data.certifications'
  });

  const [skillsInput, setSkillsInput] = useState('');

  const handleSkillsChange = (e) => {
    setSkillsInput(e.target.value);
    const parsed = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    setValue('structured_data.skills', parsed);
  };

  const tabs = [
    { id: 'profile', label: 'Profile Summary', icon: <FiUser /> },
    { id: 'experience', label: 'Experiences', icon: <FiBriefcase /> },
    { id: 'education', label: 'Education', icon: <FiBookOpen /> },
    { id: 'projects', label: 'Projects', icon: <FiActivity /> },
    { id: 'skills_certs', label: 'Skills & Awards', icon: <FiAward /> },
  ];

  return (
    <Card hoverable={false} className="text-left w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-200 gap-4">
          <Input
            placeholder="Document Name (e.g. Senior Frontend Dev)"
            className="font-bold text-lg max-w-xs border-transparent bg-transparent pl-0 focus:border-orange-500"
            {...register('name', { required: 'Name is required' })}
          />
          <div className="flex items-center space-x-2">
            <input type="hidden" value="minimal" {...register('template')} />
            <Button type="submit" loading={loading}>
              Compile & Audit
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="py-2">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Contact Full Name"
                  placeholder="John Doe"
                  {...register('structured_data.profile.name', { required: 'Name is required' })}
                />
                <Input
                  label="Contact Email"
                  placeholder="john.doe@gmail.com"
                  {...register('structured_data.profile.email', { required: 'Email is required' })}
                />
              </div>
              <Input
                label="Contact Phone"
                placeholder="+1 555-0199"
                {...register('structured_data.profile.phone')}
              />
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Profile Summary (Bio)</label>
                <textarea
                  rows={4}
                  placeholder="Brief summary introducing your professional capabilities..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  {...register('structured_data.profile.bio')}
                />
              </div>
            </div>
          )}

          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Experiences list</span>
                <Button
                  variant="secondary"
                  onClick={() => appendExp({ role: '', company: '', start_date: '', end_date: '', description: '' })}
                  className="px-3 py-1.5"
                >
                  <FiPlus className="w-4 h-4 mr-1.5" /> Add Experience
                </Button>
              </div>

              {expFields.map((item, index) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 space-y-4 relative bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => removeExp(index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-650 transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Job Title"
                      placeholder="Senior Frontend Dev"
                      {...register(`structured_data.experiences.${index}.role`, { required: 'Role is required' })}
                    />
                    <Input
                      label="Company Name"
                      placeholder="Google Inc"
                      {...register(`structured_data.experiences.${index}.company`, { required: 'Company is required' })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Start Date"
                      placeholder="e.g. Jun 2021"
                      {...register(`structured_data.experiences.${index}.start_date`)}
                    />
                    <Input
                      label="End Date"
                      placeholder="e.g. Present"
                      {...register(`structured_data.experiences.${index}.end_date`)}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Role Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe your achievements and key responsibilities..."
                      className="w-full px-4 py-2.5 rounded-xl text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      {...register(`structured_data.experiences.${index}.description`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Education qualifications</span>
                <Button
                  variant="secondary"
                  onClick={() => appendEdu({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '' })}
                  className="px-3 py-1.5"
                >
                  <FiPlus className="w-4 h-4 mr-1.5" /> Add Education
                </Button>
              </div>

              {eduFields.map((item, index) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 space-y-4 relative bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => removeEdu(index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-650 transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Institution / University"
                      placeholder="Stanford University"
                      {...register(`structured_data.educations.${index}.institution`, { required: 'Institution is required' })}
                    />
                    <Input
                      label="Degree"
                      placeholder="Master of Science"
                      {...register(`structured_data.educations.${index}.degree`, { required: 'Degree is required' })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Field of Study"
                      placeholder="Computer Science"
                      {...register(`structured_data.educations.${index}.field_of_study`)}
                    />
                    <Input
                      label="Start Date"
                      placeholder="e.g. Sep 2018"
                      {...register(`structured_data.educations.${index}.start_date`)}
                    />
                    <Input
                      label="End Date"
                      placeholder="e.g. May 2020"
                      {...register(`structured_data.educations.${index}.end_date`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Key Projects</span>
                <Button
                  variant="secondary"
                  onClick={() => appendProj({ title: '', date: '', url: '', description: '' })}
                  className="px-3 py-1.5"
                >
                  <FiPlus className="w-4 h-4 mr-1.5" /> Add Project
                </Button>
              </div>

              {projFields.map((item, index) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 space-y-4 relative bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => removeProj(index)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-655 transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Project Title"
                      placeholder="Carvion AI Platform"
                      {...register(`structured_data.projects.${index}.title`, { required: 'Title is required' })}
                    />
                    <Input
                      label="Date Completed"
                      placeholder="e.g. Jan 2026"
                      {...register(`structured_data.projects.${index}.date`)}
                    />
                    <Input
                      label="Reference Link / URL"
                      placeholder="github.com/project"
                      {...register(`structured_data.projects.${index}.url`)}
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase">Project Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the stack used and key technical outcomes..."
                      className="w-full px-4 py-2.5 rounded-xl text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      {...register(`structured_data.projects.${index}.description`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'skills_certs' && (
            <div className="space-y-6">
              <div>
                <Input
                  label="Skills (Comma-separated)"
                  value={skillsInput}
                  onChange={handleSkillsChange}
                  placeholder="React, Django REST Framework, MongoEngine, python-docx"
                />
                <p className="text-[10px] text-gray-400 mt-1">Separate skills with commas (e.g. React, spaCy, scikit-learn)</p>
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-500">Professional Certifications</span>
                  <Button
                    variant="secondary"
                    onClick={() => appendCert({ name: '', issuer: '', date: '' })}
                    className="px-3 py-1.5"
                  >
                    <FiPlus className="w-4 h-4 mr-1.5" /> Add Certification
                  </Button>
                </div>

                {certFields.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-xl border border-slate-200 space-y-4 relative bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => removeCert(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-650 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="Certification Name"
                        placeholder="Google Cloud Architect"
                        {...register(`structured_data.certifications.${index}.name`, { required: 'Name is required' })}
                      />
                      <Input
                        label="Issuing Organization"
                        placeholder="Google"
                        {...register(`structured_data.certifications.${index}.issuer`)}
                      />
                      <Input
                        label="Date Earned"
                        placeholder="e.g. Nov 2025"
                        {...register(`structured_data.certifications.${index}.date`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}
