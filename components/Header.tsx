import React, { useState } from 'react';
import { MenuIcon, XIcon } from './icons';
import Logo from './Logo';
// Fix: Import the View type from types.ts to ensure consistency.
import type { View } from '../types';

interface HeaderProps {
  apiKeyIsSet: boolean;
  // onResetApiKey: () => void; // Removed: API Key reset moved to Dashboard
  currentView?: View;
  onSetView?: (view: View) => void;
  logoUrl?: string | null;
}

const navItems: { view: View, label: string }[] = [
    { view: 'dashboard', label: 'Dashboard' },
    { view: 'estimator', label: 'Estimator' },
    { view: 'jobs', label: 'Jobs' },
    { view: 'suppliers', label: 'Suppliers' },
    { view: 'compliance', label: 'Compliance' },
    { view: 'documents', label: 'Documents' }, // New: Add documents view
    { view: 'profile', label: 'Profile' },
    // Fix: Add 'jobs-map' to the navigation items. // Removed: Map navigation moved to Dashboard
    // { view: 'jobs-map', label: 'Jobs Map' },
];

const Header: React.FC<HeaderProps> = ({ apiKeyIsSet, /* onResetApiKey, */ currentView, onSetView, logoUrl }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNavClick = (view: View) => {
    onSetView?.(view);
    setIsMobileMenuOpen(false);
  };

  const NavButton: React.FC<{ view: View, label: string, isMobile?: boolean }> = ({ view, label, isMobile = false }) => (
    <button
      onClick={() => isMobile ? handleMobileNavClick(view) : onSetView?.(view)}
      className={isMobile 
        ? `w-full text-left px-4 py-3 text-lg rounded-md transition-colors ${
            currentView === view
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
          }`
        : `px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            currentView === view
            ? 'bg-slate-700 text-white'
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
          }`
      }
    >
      {label}
    </button>
  );

  return (
    <>
      <header className="bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 border-b border-slate-700">
        <div className="container mx-auto px-4 md:px-8 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8">
              {logoUrl ? (
                <img src={logoUrl} alt="Company Logo" className="h-full w-full object-contain rounded-sm" />
              ) : (
                <Logo />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              Estimator Pro <span className="text-teal-400">Plus</span>
            </h1>
          </div>

          {/* Desktop Navigation */}
          {apiKeyIsSet && onSetView && currentView && (
            <div className="hidden md:flex items-center space-x-2">
              {navItems.map(item => <NavButton key={item.view} {...item} />)}
            </div>
          )}

          {/* Removed: API key reset button moved to Dashboard */}
          {/* {apiKeyIsSet && (
            <button
              onClick={onResetApiKey}
              className="hidden md:block text-sm text-slate-400 hover:text-red-400 transition-colors"
            >
              Reset API Key
            </button>
          )} */}

          {/* Mobile Menu Button */}
          {apiKeyIsSet && onSetView && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-white p-2 rounded-md hover:bg-slate-700/50"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        >
          <div 
            className="fixed top-0 right-0 h-full w-full max-w-xs bg-slate-900/95 backdrop-blur-lg border-l border-slate-700 p-4 animate-slide-in-right flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-white">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="text-slate-400 p-2 hover:text-white"
                aria-label="Close navigation menu"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col space-y-2 flex-grow">
              {navItems.map(item => <NavButton key={item.view} {...item} isMobile />)}
            </nav>
            {/* Removed: API key reset button moved to Dashboard */}
            {/* {apiKeyIsSet && (
                <button
                onClick={onResetApiKey}
                className="w-full text-center mt-6 text-sm py-2 px-4 rounded-md bg-slate-800 text-slate-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                >
                Reset API Key
                </button>
            )} */}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;