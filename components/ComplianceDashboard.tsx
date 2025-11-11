import React from 'react';
import type { Job, Checklist } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { ShieldCheckIcon } from './icons';

interface ComplianceDashboardProps {
    jobs: Job[];
    onViewChecklist: (checklist: Checklist) => void;
    onViewRAMS: (job: Job) => void;
}

const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ jobs, onViewChecklist, onViewRAMS }) => {
    const jobsWithRAMS = jobs.filter(job => job.documents?.RAMS);

    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-3">
                <ShieldCheckIcon className="h-8 w-8 text-teal-400" />
                Compliance Hub
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Checklist Library */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Safety Checklist Library</h3>
                    <div className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-lg">
                        <div className="divide-y divide-slate-700">
                            {CHECKLIST_TEMPLATES.map(checklist => (
                                <div key={checklist.id} onClick={() => onViewChecklist(checklist)} className="p-4 hover:bg-slate-800 transition-colors cursor-pointer">
                                    <div>
                                        <p className="font-semibold text-teal-400">{checklist.title}</p>
                                        <p className="text-sm text-slate-400 mt-1">{checklist.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Generated RAMS */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Generated RAMS Documents</h3>
                    <div className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-lg">
                        {jobsWithRAMS.length > 0 ? (
                            <div className="divide-y divide-slate-700">
                                {jobsWithRAMS.map(job => (
                                    <div key={job.id} onClick={() => onViewRAMS(job)} className="p-4 hover:bg-slate-800 transition-colors cursor-pointer">
                                        <div>
                                            <p className="font-semibold text-white">{job.name}</p>
                                            <p className="text-sm text-slate-400 mt-1">
                                                Client: {job.clientName} | Location: {job.location}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <p>No RAMS documents have been generated yet.</p>
                                <p className="text-xs mt-1">You can generate RAMS from any job's detail page.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplianceDashboard;