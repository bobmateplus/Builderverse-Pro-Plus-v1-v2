import React from 'react';
import type { Checklist } from '../types';
import { XIcon, ArrowDownTrayIcon } from './icons';

interface ChecklistModalProps {
    checklist: Checklist;
    onClose: () => void;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({ checklist, onClose }) => {

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[90vh] rounded-lg shadow-2xl flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 non-printable">
                    <h2 className="text-xl font-bold text-white">{checklist.title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XIcon className="h-6 w-6" /></button>
                </header>

                <main className="flex-1 p-6 overflow-y-auto printable-checklist">
                    <div className="prose prose-invert prose-slate max-w-none">
                        <h1>{checklist.title}</h1>
                        <p className="lead">{checklist.description}</p>
                        <hr />
                        <ul className="space-y-4">
                            {checklist.items.map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <div className="flex-shrink-0 mr-3 mt-1 w-5 h-5 border-2 border-slate-500 rounded-sm"></div>
                                    <div>
                                        <span>{item.text}</span>
                                        {item.subItems && (
                                            <ul className="mt-2 space-y-2 pl-4">
                                                {item.subItems.map((subItem, subIndex) => (
                                                    <li key={subIndex} className="flex items-start">
                                                        <div className="flex-shrink-0 mr-3 mt-1 w-4 h-4 border border-slate-600 rounded-sm"></div>
                                                        <span>{subItem}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </main>

                <footer className="p-4 border-t border-slate-700 flex justify-end items-center flex-shrink-0 non-printable">
                    <button 
                        onClick={handlePrint} 
                        className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5"/>
                        Print Checklist
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ChecklistModal;