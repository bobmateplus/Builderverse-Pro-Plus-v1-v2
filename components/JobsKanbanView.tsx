import React, { useState } from 'react';
import type { Job, JobStatus } from '../types';

interface JobsKanbanViewProps {
    jobs: Job[];
    onSelectJob: (job: Job) => void;
    onUpdateJobStatus: (jobId: number, status: JobStatus) => void;
}

const statusStyles: Record<JobStatus, { dot: string; text: string; bg: string; border: string }> = {
    'Estimate': { dot: 'bg-blue-400', text: 'text-blue-300', bg: 'bg-slate-800/50', border: 'border-blue-500' },
    'Quoted': { dot: 'bg-purple-400', text: 'text-purple-300', bg: 'bg-slate-800/50', border: 'border-purple-500' },
    'In Progress': { dot: 'bg-yellow-400', text: 'text-yellow-300', bg: 'bg-slate-800/50', border: 'border-yellow-500' },
    'Complete': { dot: 'bg-green-400', text: 'text-green-300', bg: 'bg-slate-800/50', border: 'border-green-500' },
    'Invoiced': { dot: 'bg-orange-400', text: 'text-orange-300', bg: 'bg-slate-800/50', border: 'border-orange-500' },
    'Archived': { dot: 'bg-gray-500', text: 'text-gray-300', bg: 'bg-slate-800/50', border: 'border-gray-500' },
};

const KanbanColumn: React.FC<{
    status: JobStatus;
    jobs: Job[];
    onSelectJob: (job: Job) => void;
    onUpdateJobStatus: (jobId: number, status: JobStatus) => void;
    isDraggingOver: boolean;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ status, jobs, onSelectJob, onUpdateJobStatus, isDraggingOver, ...dragHandlers }) => {

    const styles = statusStyles[status];

    const onDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: number) => {
        e.dataTransfer.setData('jobId', jobId.toString());
    };

    return (
        <div 
            className="flex-1 min-w-[280px] max-w-sm"
            onDragOver={(e) => e.preventDefault()}
            {...dragHandlers}
        >
            <div className={`flex flex-col h-full bg-slate-800/70 rounded-lg border ${isDraggingOver ? 'border-teal-400' : 'border-slate-700'} transition-colors`}>
                <div className={`flex items-center gap-3 p-3 border-b border-slate-700`}>
                    <div className={`w-3 h-3 rounded-full ${styles.dot}`}></div>
                    <h3 className={`font-bold ${styles.text}`}>{status}</h3>
                    <span className="text-sm text-slate-500">{jobs.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, job.id)}
                            onClick={() => onSelectJob(job)}
                            className="bg-slate-800 p-3 rounded-md border border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
                        >
                            <div>
                                <p className="font-semibold text-white text-sm truncate">{job.name}</p>
                                <p className="text-xs text-slate-400 mt-1">{job.location}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const JobsKanbanView: React.FC<JobsKanbanViewProps> = ({ jobs, onSelectJob, onUpdateJobStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<JobStatus | null>(null);
    const statuses: JobStatus[] = ['Estimate', 'Quoted', 'In Progress', 'Complete', 'Invoiced', 'Archived'];

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: JobStatus) => {
        const jobId = parseInt(e.dataTransfer.getData('jobId'), 10);
        if (jobId) {
            onUpdateJobStatus(jobId, status);
        }
        setDraggingOverColumn(null);
    };

    return (
        <div className="flex gap-4 pb-4 overflow-x-auto">
            {statuses.map(status => (
                <KanbanColumn
                    key={status}
                    status={status}
                    jobs={jobs.filter(j => j.status === status)}
                    onSelectJob={onSelectJob}
                    onUpdateJobStatus={onUpdateJobStatus}
                    isDraggingOver={draggingOverColumn === status}
                    onDragEnter={() => setDraggingOverColumn(status)}
                    onDragLeave={() => setDraggingOverColumn(null)}
                    onDrop={(e) => handleDrop(e, status)}
                />
            ))}
        </div>
    );
};

export default JobsKanbanView;