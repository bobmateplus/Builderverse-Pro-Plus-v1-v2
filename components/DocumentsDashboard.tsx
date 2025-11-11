import React from 'react';
import type { Job, DocumentType } from '../types';
import { BriefcaseIcon, ViewColumnsIcon } from './icons'; // Assuming relevant icons

interface DocumentsDashboardProps {
    jobs: Job[];
    onViewDocument: (job: Job, type: DocumentType, content: string) => void;
}

const DocumentsDashboard: React.FC<DocumentsDashboardProps> = ({ jobs, onViewDocument }) => {
    // Filter out jobs that don't have any documents
    const jobsWithDocuments = jobs.filter(job => job.documents && Object.keys(job.documents).length > 0);

    if (jobsWithDocuments.length === 0) {
        return (
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold mb-6 text-white">All Documents</h2>
                <div className="text-center bg-slate-800 p-12 rounded-lg border border-slate-700 border-dashed">
                    <ViewColumnsIcon className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-4 text-lg font-medium text-white">No documents generated yet</h3>
                    <p className="mt-1 text-sm text-slate-400">Generate quotes, RAMS, invoices and more from individual job pages.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-white">All Documents</h2>

            <div className="space-y-6">
                {jobsWithDocuments.map(job => (
                    <div key={job.id} className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 bg-slate-700/50 flex items-center gap-3">
                            <BriefcaseIcon className="h-6 w-6 text-teal-400" />
                            <h3 className="font-bold text-lg text-white">{job.name}</h3>
                            <span className="text-sm text-slate-400">({job.clientName}, {job.location})</span>
                        </div>
                        <div className="divide-y divide-slate-700">
                            {Object.entries(job.documents || {}).map(([docType, content]) => (
                                <div key={`${job.id}-${docType}`} className="flex justify-between items-center p-4 hover:bg-slate-800 transition-colors">
                                    <div>
                                        <p className="font-semibold text-white">{docType}</p>
                                        <p className="text-sm text-slate-400">Generated: {new Date(job.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => onViewDocument(job, docType as DocumentType, content)}
                                        className="btn-3d bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors"
                                    >
                                        View Document
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocumentsDashboard;