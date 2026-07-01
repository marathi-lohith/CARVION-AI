import React from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckSquare } from 'react-icons/fi';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import { FORM_VALIDATORS } from '../../../utils/validators.js';

export default function BroadcastModal({ isOpen, onClose, onBroadcast, loading }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      message: '',
      type: 'System'
    }
  });

  const onSubmit = (data) => {
    onBroadcast(data);
    reset();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 z-10 text-left"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center space-x-1.5">
                <FiCheckSquare className="text-orange-500 w-5 h-5" />
                <span>Admin Broadcast Alert</span>
              </h3>
              <button 
                type="button" 
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-105 text-slate-400 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 space-y-4">
                <Input
                  label="Broadcast Title"
                  placeholder="e.g. System Maintenance Scheduled"
                  error={errors.title?.message}
                  {...register('title', FORM_VALIDATORS.requiredField('Title'))}
                />

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-655 uppercase">Alert Category</label>
                  <select
                    {...register('type')}
                    className="w-full px-4 py-2.5 rounded-xl text-sm border bg-white text-slate-700 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="System">System Info</option>
                    <option value="Job Alert">Job Suggestion</option>
                    <option value="Course Suggestion">Course advisory</option>
                    <option value="Mock Test Result">Mock test metrics</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-655 uppercase">Broadcast Message</label>
                  <textarea
                    rows={4}
                    placeholder="Type details sent to all active users..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm border bg-white text-slate-850 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium"
                    {...register('message', { required: 'Message is required' })}
                  />
                  {errors.message && (
                    <span className="text-[11px] text-red-500 font-medium">{errors.message.message}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <Button variant="ghost" onClick={onClose} className="font-bold">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  loading={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/10 font-bold"
                >
                  Broadcast Alert
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
