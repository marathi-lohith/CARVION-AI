import React from 'react';
import { useForm } from 'react-hook-form';
import Card from '../../../components/common/Card.jsx';
import Input from '../../../components/common/Input.jsx';
import Button from '../../../components/common/Button.jsx';
import { FiSearch, FiMapPin } from 'react-icons/fi';

export default function SearchFilters({ onSearch, defaultQuery = '', showLocation = false, defaultLocation = '', loading = false }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      query: defaultQuery,
      location: defaultLocation,
    }
  });

  React.useEffect(() => {
    reset({
      query: defaultQuery,
      location: defaultLocation,
    });
  }, [defaultQuery, defaultLocation, reset]);

  return (
    <Card hoverable={false} className="w-full p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)]">
      <form onSubmit={handleSubmit(onSearch)} className="flex flex-col sm:flex-row items-end gap-3 w-full">
        <div className="flex-1 w-full text-left relative">
          <Input
            label="Search Query"
            placeholder="e.g. Python Developer"
            {...register('query', { required: true })}
            className="pl-9"
          />
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3 bottom-3.5" />
        </div>

        {showLocation && (
          <div className="w-full sm:w-64 text-left relative">
            <Input
              label="Location"
              placeholder="e.g. New York, Remote"
              {...register('location')}
              className="pl-9"
            />
            <FiMapPin className="w-4 h-4 text-slate-400 absolute left-3 bottom-3.5" />
          </div>
        )}

        <Button 
          type="submit" 
          loading={loading}
          className="w-full sm:w-auto px-6 h-10 mb-[1px] font-bold"
        >
          Search
        </Button>
      </form>
    </Card>
  );
}
