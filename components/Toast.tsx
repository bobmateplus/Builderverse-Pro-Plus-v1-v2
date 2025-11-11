
import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { WarningIcon, XIcon } from './icons'; // Assuming Info and Success icons could be added here

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-3 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-slate-800 border border-slate-700";
  
  const typeStyles = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
  };

  const Icon = () => {
      switch (toast.type) {
          case 'error':
              return <WarningIcon className={`h-6 w-6 ${typeStyles[toast.type]}`} />;
          // Add other icons here for success, info etc.
          default:
              return <WarningIcon className={`h-6 w-6 ${typeStyles.info}`} />;
      }
  }

  return (
    <div className={`${baseClasses} animate-fade-in-up`} role="alert">
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg`}>
        <Icon />
      </div>
      <div className="text-sm font-normal text-slate-300">{toast.message}</div>
      <button 
        type="button" 
        onClick={() => onDismiss(toast.id)} 
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-slate-700 inline-flex items-center justify-center h-8 w-8 text-slate-500 hover:text-white" 
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
