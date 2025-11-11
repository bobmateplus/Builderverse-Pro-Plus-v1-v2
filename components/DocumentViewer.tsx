import React, { useState, useEffect } from 'react';
// Fix: Import necessary icons and types.
import { XIcon, ArrowDownTrayIcon, PencilIcon } from './icons';
import type { Job, DocumentType, JobStatus } from '../types';

// Fix: Define props interface for DocumentViewer.
interface DocumentViewerProps {
    document: { type: DocumentType, content: string };
    job: Job;
    onClose: () => void;
    onSend: (jobId: number, newStatus: JobStatus) => void;
    onUpdateDocument: (jobId: number, docType: DocumentType, newContent: string) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, job, onClose, onSend, onUpdateDocument }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(document.content);

    useEffect(() => {
        setEditedContent(document.content);
        setIsEditing(false); // Reset editing state when document prop changes
    }, [document]);

    const handleClose = () => {
        if (isEditing && editedContent !== document.content) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };
    
    // Renders markdown content to HTML elements.
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements = [];
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('|')) {
                if (!inTable) {
                    inTable = true;
                    const tableRows = [];
                    let currentLine = i;
                    
                    while (currentLine < lines.length && lines[currentLine].includes('|')) {
                        tableRows.push(lines[currentLine]);
                        currentLine++;
                    }
                    
                    const headerLine = tableRows[0];
                    const separatorLine = tableRows[1];
                    const bodyLines = tableRows.slice(2);

                    if (headerLine && separatorLine && separatorLine.includes('---')) {
                        const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
                        const alignments = separatorLine.split('|').map(s => {
                            const trimmed = s.trim();
                            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
                            if (trimmed.endsWith(':')) return 'right';
                            return 'left';
                        }).filter((_, index) => index < headers.length);


                        elements.push(
                        <div key={`table-${i}`} className="overflow-x-auto my-4">
                            <table className="min-w-full divide-y divide-slate-600">
                            <thead className="bg-slate-700/50">
                                <tr>
                                {headers.map((header, hIndex) => (
                                    <th key={hIndex} scope="col" style={{ textAlign: alignments[hIndex] as any }} className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                    {header}
                                    </th>
                                ))}
                                </tr>
                            </thead>
                            <tbody className="bg-slate-800 divide-y divide-slate-700">
                                {bodyLines.map((row, rIndex) => (
                                <tr key={rIndex}>
                                    {row.split('|').map(c => c.trim()).filter(Boolean).map((cell, cIndex) => (
                                    <td key={cIndex} style={{ textAlign: alignments[cIndex] as any }} className="px-4 py-2 whitespace-nowrap text-sm text-slate-300">{cell}</td>
                                    ))}
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                        );
                        i = currentLine - 1; 
                    } else {
                        inTable = false;
                        elements.push(<p key={i} className="my-1.5 text-slate-300">{line}</p>)
                    }
                }
                continue; 
            } else {
                inTable = false;
            }
            
            if (line.startsWith('###')) {
                elements.push(<h3 key={i} className="text-xl font-bold mt-4 mb-2 text-teal-400">{line.replace(/###\s?/, '')}</h3>);
            } else if (line.startsWith('##')) {
                elements.push(<h2 key={i} className="text-2xl font-bold mt-6 mb-3 text-white">{line.replace(/##\s?/, '')}</h2>);
            } else if (line.startsWith('#')) {
                elements.push(<h1 key={i} className="text-3xl font-bold mt-8 mb-4 text-white">{line.replace(/#\s?/, '')}</h1>);
            } else if (line.startsWith('* ')) {
                elements.push(<li key={i} className="ml-6 list-disc">{line.substring(2)}</li>);
            } else if (/^\d+\.\s/.test(line)) {
                elements.push(<li key={i} className="ml-6 list-decimal">{line.substring(line.indexOf(' ') + 1)}</li>);
            } else if (line.startsWith('>')) {
                elements.push(<blockquote key={i} className="border-l-4 border-slate-600 pl-4 italic text-slate-400 my-2">{line.substring(1)}</blockquote>)
            } else if (line.trim() === '---') {
                elements.push(<hr key={i} className="my-4 border-slate-600" />);
            } else if (line.startsWith('```')) {
                const codeBlockLines = [];
                let j = i + 1;
                while (j < lines.length && !lines[j].startsWith('```')) {
                    codeBlockLines.push(lines[j]);
                    j++;
                }
                elements.push(<pre key={i} className="bg-slate-900 p-3 rounded-md my-2 text-sm text-slate-300 overflow-x-auto"><code>{codeBlockLines.join('\n')}</code></pre>);
                i = j;
            } else {
                const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
                elements.push(
                <p key={i} className="my-1.5 text-slate-300">
                    {parts.map((part, pIndex) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={pIndex}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={pIndex} className="bg-slate-700 text-teal-400 px-1 py-0.5 rounded-md text-xs">{part.slice(1,-1)}</code>
                    }
                    return part;
                    })}
                </p>
                );
            }
        }
        return elements;
    };
    
    const handleSend = () => {
        if (document.type === 'Quote') {
            onSend(job.id, 'Quoted');
        } else if (document.type === 'Invoice') {
            onSend(job.id, 'Invoiced');
        } else {
            handleClose();
        }
    };

    const handlePrint = () => {
      window.print();
    };

    const handleSave = () => {
        onUpdateDocument(job.id, document.type, editedContent);
        setIsEditing(false);
    };

    let actionText = '';
    if (document.type === 'Quote') actionText = 'Send & Mark as Quoted';
    if (document.type === 'Invoice') actionText = 'Send & Mark as Invoiced';


    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">{document.type} for "{job.name}"</h2>
                        <p className="text-sm text-slate-400">Generated by Bob Mate AI</p>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-white"><XIcon className="h-6 w-6" /></button>
                </header>
                <main className="printable-area flex-1 p-6 overflow-y-auto">
                    {isEditing ? (
                        <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-full bg-slate-800 text-slate-200 border border-slate-600 rounded-md p-4 focus:ring-teal-500 focus:border-teal-500 transition font-mono text-sm"
                            aria-label="Document Content Editor"
                        />
                    ) : (
                       <div className="prose prose-invert prose-slate max-w-none">
                            {renderMarkdown(document.content)}
                       </div>
                    )}
                </main>
                <footer className="p-4 border-t border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                         {!isEditing && (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="bg-slate-700 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2"
                            >
                                <PencilIcon className="h-5 w-5"/>
                                Edit
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex items-center gap-3">
                                <button onClick={handleSave} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors">Save Changes</button>
                                <button onClick={() => { setEditedContent(document.content); setIsEditing(false); }} className="text-slate-400 hover:text-white text-sm font-medium">Cancel</button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                         <button 
                            onClick={handlePrint} 
                            className="bg-slate-700 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5"/>
                            Download PDF
                        </button>
                        <button onClick={handleClose} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors">Close</button>
                        {(document.type === 'Quote' || document.type === 'Invoice') && !isEditing && (
                            <button onClick={handleSend} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                                {actionText}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DocumentViewer;