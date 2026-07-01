import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiFile } from 'react-icons/fi';
import { FILE_CONSTRAINTS } from '../../../config/constants.js';

export default function ResumeDropzone({ onFileSelect, loading, progressText }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: FILE_CONSTRAINTS.MAX_SIZE_BYTES,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: loading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? 'border-orange-500 bg-orange-50/40' 
            : 'border-slate-300 hover:border-orange-400 bg-white shadow-sm'
        } ${loading ? 'opacity-75 cursor-not-allowed bg-slate-50/30' : ''}`}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
            <p className="text-sm font-bold text-slate-700 animate-pulse">{progressText || 'Processing...'}</p>
          </div>
        ) : (
          <>
            <FiUploadCloud className={`w-12 h-12 mb-4 transition-colors duration-300 ${isDragActive ? 'text-orange-500' : 'text-slate-400'}`} />
            {isDragActive ? (
              <p className="text-sm font-bold text-orange-500">Drop your resume document here...</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-700">
                  Drag & drop your resume file, or <span className="text-orange-500 hover:underline">browse</span>
                </p>
                <p className="text-xs text-slate-400 dark:text-[#6B7FA3] font-medium">
                  Supports PDF and DOCX files up to {FILE_CONSTRAINTS.MAX_SIZE_MB}MB
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs text-left font-medium">
          {fileRejections[0].errors[0].code === 'file-too-large' ? (
            <span>The selected file size exceeds the {FILE_CONSTRAINTS.MAX_SIZE_MB}MB limit.</span>
          ) : (
            <span>Invalid file format. Only PDF and DOCX are accepted.</span>
          )}
        </div>
      )}
    </div>
  );
}
