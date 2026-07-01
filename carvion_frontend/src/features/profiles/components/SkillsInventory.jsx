import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiX } from 'react-icons/fi';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Badge from '../../../components/common/Badge.jsx';

export default function SkillsInventory({ currentSkills = [], onSave, saving }) {
  const [skills, setSkills] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Sync state with parent payload
  useEffect(() => {
    if (currentSkills) {
      setSkills([...currentSkills]);
    }
  }, [currentSkills]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    const cleanVal = inputValue.trim();
    if (cleanVal && !skills.some((s) => s.toLowerCase() === cleanVal.toLowerCase())) {
      setSkills((prev) => [...prev, cleanVal]);
      setInputValue('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  return (
    <Card hoverable={false} className="space-y-4 text-left bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-sm">
      <h3 className="text-lg font-extrabold text-slate-850">Skills Inventory Management</h3>
      <p className="text-xs text-slate-400 -mt-1.5 font-medium">
        Manage your competency indicators. These are evaluated by the ATS matching engine.
      </p>

      {/* Input box */}
      <form onSubmit={handleAddSkill} className="flex items-center space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g. Redux Toolkit"
          className="flex-1 px-4 py-2 rounded-xl text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all duration-200 font-semibold"
        />
        <Button type="submit" variant="secondary" className="px-3 py-2.5 font-bold">
          <FiPlus className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </form>

      {/* Skills display cloud */}
      <div className="min-h-[100px] p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-wrap gap-2 items-start content-start">
        <AnimatePresence>
          {skills.length === 0 ? (
            <motion.p
              className="text-xs text-slate-400 italic text-center w-full my-auto font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No skills added yet. Type a competency to compile your list.
            </motion.p>
          ) : (
            skills.map((skill) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Badge variant="brand" className="pl-3 pr-1.5 py-1 flex items-center space-x-1.5">
                  <span className="text-xs font-semibold">{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-full hover:bg-orange-100 text-orange-655 transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between pt-2">
        {skills.length === 0 && (
          <p className="text-[10px] text-slate-400 italic font-medium">
            Saving with an empty inventory is allowed.
          </p>
        )}
        <div className="ml-auto">
          <Button 
            onClick={() => onSave({ skills })} 
            variant="primary" 
            loading={saving}
            className="font-bold"
          >
            Save Inventory
          </Button>
        </div>
      </div>
    </Card>
  );
}
