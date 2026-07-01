import React from 'react';

const Input = React.forwardRef(({
  label,
  name,
  type = 'text',
  error,
  placeholder,
  className = '',
  icon,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const handleChange = (e) => {
    let value = e.target.value;
    if (name && name.toLowerCase().includes('phone')) {
      value = value.replace(/[^0-9]/g, '');
      e.target.value = value;
    } else if (
      type === 'text' && 
      value && 
      name && 
      !name.toLowerCase().includes('email') && 
      !name.toLowerCase().includes('url') && 
      !name.toLowerCase().includes('password')
    ) {
      const words = value.split(' ');
      value = words.map(word => {
        if (/^[a-zA-Z]/.test(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      }).join(' ');
      e.target.value = value;
    }

    // Call the original onChange from props (e.g., from react-hook-form)
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="w-full flex flex-col space-y-1.5 text-left">
      {label && (
        <label 
          htmlFor={name} 
          className="text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} ${type === 'password' ? 'pr-10' : 'pr-4'} py-2.5 rounded-xl text-sm border bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-slate-205 dark:border-slate-800 outline-none transition-all duration-200 ${
            error 
              ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10' 
              : 'focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
          } ${className}`}
          {...props}
          onChange={handleChange}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-slate-400 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-350 transition-colors focus:outline-none"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <span className="text-[11px] text-red-500 font-medium">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
