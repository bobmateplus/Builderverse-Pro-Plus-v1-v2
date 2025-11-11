import React, { useState } from 'react';
import type { Job, JobStatus, View } from '../types';
import DashboardSummary from './DashboardSummary';
import { BriefcaseIcon, ListBulletIcon, ViewColumnsIcon, GeoIcon } from './icons'; // Added GeoIcon
import JobsKanbanView from './JobsKanbanView';

interface JobsDashboardProps {
    jobs: Job[];
    onSelectJob: (job: Job) => void;
    onUpdateJobStatus: (jobId: number, status: JobStatus) => void;
    onNavigate: (view: View) => void;
}

const statusStyles: Record<JobStatus, { dot: string; text: string; bg: string; }> = {
    'Estimate': { dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-blue-900/50' },
    'Quoted': { dot: 'bg-purple-400', text: 'text-purple-300', bg: 'bg-purple-900/50' },
    'In Progress': { dot: 'bg-yellow-400', text: 'text-yellow-300', bg: 'bg-yellow-900/50' },
    'Complete': { dot: 'bg-green-400', text: 'text-green-300', bg: 'bg-green-900/50' },
    'Invoiced': { dot: 'bg-orange-400', text: 'text-orange-300', bg: 'bg-orange-900/50' },
    'Archived': { dot: 'bg-gray-500', text: 'text-gray-300', bg: 'bg-gray-700/50' },
};

// Removed 'map' option from ViewSwitcher
const ViewSwitcher: React.FC<{ view: 'list' | 'kanban'; setView: (view: 'list' | 'kanban') => void; }> = ({ view, setView }) => (
    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
        <button 
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${view === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            <ListBulletIcon className="h-5 w-5" />
            List
        </button>
        <button 
            onClick={() => setView('kanban')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${view === 'kanban' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
            <ViewColumnsIcon className="h-5 w-5" />
            Board
        </button>
        {/* Removed 'Map' button from here */}
    </div>
);


const JobsDashboard: React.FC<JobsDashboardProps> = ({ jobs, onSelectJob, onUpdateJobStatus, onNavigate }) => {
  // viewMode no longer needs 'map'
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  if (jobs.length === 0) {
      return (
        <div className="animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-white">Jobs Dashboard</h2>
          <div className="text-center bg-slate-800 p-12 rounded-lg border border-slate-700 border-dashed">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-4 text-lg font-medium text-white">No jobs found</h3>
            <p className="mt-1 text-sm text-slate-400">Get started by creating your first estimate.</p>
            <div className="mt-6">
                <button
                    type="button"
                    onClick={() => onNavigate('estimator')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500"
                >
                    Create New Estimate
                </button>
            </div>
          </div>
        </div>
      );
  }
  
  // Removed direct navigation to 'jobs-map' from here.
  // The 'jobs-map' view is now triggered solely from the main Dashboard.

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Jobs Dashboard</h2>
        <ViewSwitcher view={viewMode} setView={setViewMode} />
      </div>
      
      <DashboardSummary jobs={jobs} />

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => {
              const styles = statusStyles[job.status] || statusStyles['Archived'];
              return (
                <div 
                  key={job.id} 
                  onClick={() => onSelectJob(job)} 
                  className="bg-slate-800 rounded-lg shadow-lg hover:shadow-teal-500/10 border border-slate-700 cursor-pointer flex flex-col justify-between p-5"
                >
                    <div>
                      <h3 className="font-bold text-white truncate text-lg mb-1">{job.name}</h3>
                      <p className="text-sm text-slate-400 mb-4">{job.location}</p>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs">
                        <span className="text-slate-500">
                          {new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <div className={`inline-flex items-center gap-2 font-semibold px-2.5 py-1 rounded-full ${styles.bg} ${styles.text}`}>
                            <div className={`w-2 h-2 rounded-full ${styles.dot}`}></div>
                            {job.status}
                        </div>
                    </div>
                </div>
              )
            })}
        </div>
      ) : (
        <JobsKanbanView 
            jobs={jobs} 
            onSelectJob={onSelectJob}
            onUpdateJobStatus={onUpdateJobStatus} 
        />
      )}
    </div>
  );
};

export default JobsDashboard;