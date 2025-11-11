import React, { useState } from 'react';
import type { Supplier, SupplierCategory } from '../types';
import { UsersIcon, PlusIcon, MagnifyingGlassIcon, TrashIcon, PencilIcon } from './icons';
import { SUPPLIER_CATEGORIES } from '../constants';

interface SuppliersDashboardProps {
    suppliers: Supplier[];
    onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
    onUpdateSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (id: number) => void;
}

const SupplierForm: React.FC<{
    supplier: Partial<Supplier> | null;
    onSave: (supplier: Omit<Supplier, 'id'> | Supplier) => void;
    onCancel: () => void;
}> = ({ supplier, onSave, onCancel }) => {
    const isEditing = supplier && 'id' in supplier;
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        category: supplier?.category || 'Materials',
        contactPerson: supplier?.contactPerson || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        notes: supplier?.notes || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...supplier, ...formData } as Supplier);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-4 mb-8 animate-fade-in-up border border-slate-700">
            <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Supplier Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition" />
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition">
                        {SUPPLIER_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-slate-300 mb-1">Contact Person</label>
                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition" />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition" />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
                    <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"></textarea>
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors">Cancel</button>
                <button type="submit" className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors">Save Supplier</button>
            </div>
        </form>
    );
};

const SuppliersDashboard: React.FC<SuppliersDashboardProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = (supplier: Omit<Supplier, 'id'> | Supplier) => {
        if ('id' in supplier) {
            onUpdateSupplier(supplier);
        } else {
            onAddSupplier(supplier);
        }
        setEditingSupplier(null);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setEditingSupplier(null);
        setIsAdding(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Suppliers & Contacts</h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingSupplier(null); }}
                    className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    Add Supplier
                </button>
            </div>

            {(isAdding || editingSupplier) && (
                <SupplierForm
                    supplier={editingSupplier || {}}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}

            {suppliers.length === 0 && !isAdding ? (
                <div className="text-center bg-slate-800 p-12 rounded-lg border border-slate-700 border-dashed">
                    <UsersIcon className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-4 text-lg font-medium text-white">No suppliers yet</h3>
                    <p className="mt-1 text-sm text-slate-400">Add your first supplier or subcontractor to get started.</p>
                </div>
            ) : (
                <div className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-lg">
                    <div className="p-4 border-b border-slate-700">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, category, or contact..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition pl-10 p-2"
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-slate-700">
                        {filteredSuppliers.map(supplier => (
                            <div key={supplier.id} className="p-4 hover:bg-slate-800 transition-colors flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-bold text-white">{supplier.name} <span className="text-xs font-medium bg-slate-700 text-teal-300 px-2 py-0.5 rounded-full ml-2">{supplier.category}</span></p>
                                    <p className="text-sm text-slate-300">{supplier.contactPerson}</p>
                                    <p className="text-sm text-slate-400">{supplier.phone} &bull; {supplier.email}</p>
                                    {supplier.notes && <p className="text-sm text-slate-400 pt-1 italic">Notes: {supplier.notes}</p>}
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                    <button onClick={() => { setEditingSupplier(supplier); setIsAdding(false); window.scrollTo(0,0); }} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => { if (window.confirm(`Are you sure you want to delete ${supplier.name}?`)) { onDeleteSupplier(supplier.id); } }} className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-slate-700"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredSuppliers.length === 0 && suppliers.length > 0 && (
                        <p className="text-center p-8 text-slate-400">No suppliers match your search.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SuppliersDashboard;