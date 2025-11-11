import React, { useState } from 'react';
// Fix: Import necessary types and components.
import type { Job, DocumentType, Task } from '../types';
import EstimateDisplay from './EstimateDisplay';
import { PlusIcon, TrashIcon } from './icons';

// Fix: Define props interface for JobDetail.
interface JobDetailProps {
    job: Job;
    onBack: () => void;
    onGenerateDocument: (job: Job, type: DocumentType) => void;
    isDocLoading: boolean;
    onUpdateDocument: (jobId: number, docType: DocumentType, newContent: string) => void;
    onAddTask: (jobId: number, task: Omit<Task, 'id' | 'isComplete'>) => void;
    onUpdateTask: (jobId: number, task: Task) => void;
    onDeleteTask: (jobId: number, taskId: number) => void;
}

const TaskList: React.FC<{
  job: Job;
  onAddTask: JobDetailProps['onAddTask'];
  onUpdateTask: JobDetailProps['onUpdateTask'];
  onDeleteTask: JobDetailProps['onDeleteTask'];
}> = ({ job, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddTask(job.id, { text: newTaskText, dueDate: newDueDate, assignee: newAssignee });
    setNewTaskText('');
    setNewDueDate('');
    setNewAssignee('');
  };

  const handleToggleComplete = (task: Task) => {
    onUpdateTask(job.id, { ...task, isComplete: !task.isComplete });
  };
  
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-xl h-full">
      <h3 className="text-xl font-bold mb-4 text-teal-400">Tasks</h3>
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
        {(job.tasks || []).length > 0 ? (
          (job.tasks || []).map(task => (
            <div key={task.id} className={`flex items-center justify-between p-2 rounded-md ${task.isComplete ? 'bg-slate-700/50' : 'bg-slate-700'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.isComplete}
                  onChange={() => handleToggleComplete(task)}
                  className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-600 cursor-pointer"
                />
                <div>
                  <p className={`text-sm ${task.isComplete ? 'text-slate-400 line-through' : 'text-white'}`}>{task.text}</p>
                  <p className="text-xs text-slate-400">
                    {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    {task.dueDate && task.assignee && <span> &bull; </span>}
                    {task.assignee && <span>To: {task.assignee}</span>}
                  </p>
                </div>
              </div>
              <button onClick={() => onDeleteTask(job.id, task.id)} className="text-slate-500 hover:text-red-400 p-1"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No tasks added yet.</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-700 pt-4">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a new task..."
          className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
          required
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={newDueDate}
            min={today}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
          />
          <input
            type="text"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="Assignee (optional)"
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
          />
        </div>
        <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 flex items-center justify-center gap-2 transition-colors">
          <PlusIcon className="h-5 w-5"/> Add Task
        </button>
      </form>
    </div>
  );
};


const JobDetail: React.FC<JobDetailProps> = ({ job, onBack, onGenerateDocument, isDocLoading, onUpdateDocument, onAddTask, onUpdateTask, onDeleteTask }) => {
  const documentTypes: DocumentType[] = ['Quote', 'RAMS', 'Programme', 'Email', 'Invoice'];
  const { coords } = job;

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-teal-400 hover:text-teal-300 mb-6 inline-block">&larr; Back to Jobs</button>
      
      <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-xl mb-8">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold text-white">{job.name}</h2>
                <p className="text-slate-400 mt-1">{job.location} &bull; {job.status}</p>
                <div className="mt-4 border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-300">
                    <strong className="font-medium text-slate-100">Client:</strong> {job.clientName}
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    <strong className="font-medium text-slate-100">Address:</strong> {job.clientAddress}
                  </p>
                </div>
            </div>
            <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                <span className="text-sm text-slate-500">Created: {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-xl">
              <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2 text-teal-400">Generate Documents</h3>
                  <div className="flex flex-wrap gap-2">
                      {documentTypes.map(type => (
                           <button 
                              key={type}
                              onClick={() => onGenerateDocument(job, type)}
                              disabled={isDocLoading}
                              className="bg-slate-700 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 disabled:bg-slate-600/50 disabled:cursor-not-allowed transition-colors"
                           >
                              {isDocLoading ? `Generating...` : `Generate ${type}`}
                          </button>
                      ))}
                  </div>
                   {isDocLoading && <p className="text-sm text-slate-400 mt-2">Bob Mate AI is preparing your document, this may take a moment...</p>}
              </div>
              <EstimateDisplay result={job.estimate} />
           </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <TaskList
            job={job}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
          {coords && (
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg shadow-xl">
              <h3 className="text-xl font-bold mb-3 text-teal-400">Job Location</h3>
              <div className="aspect-video rounded-md overflow-hidden border-2 border-slate-700">
                 <iframe
                    className="w-full h-full"
                    title="Job Location Map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.005},${coords.lng + 0.005},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;