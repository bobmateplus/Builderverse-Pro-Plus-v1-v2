
import React, { useState, useEffect, useRef } from 'react';
import { useGeolocation, getPostcodeFromCoords, getCoordsFromAddress } from '../hooks/useGeolocation';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speak } from '../utils/textToSpeech';
import { GeoIcon, MicrophoneIcon, SpeakerWaveIcon, PaperClipIcon, TrashIcon, MagnifyingGlassIcon } from './icons';
import type { UploadedFile } from '../types';

interface InputFormProps {
  onEstimateRequest: (
    clientName: string,
    clientAddress: string,
    jobName: string,
    supplyOption: string,
    location: string,
    useGrounding: boolean,
    projectNotes: string,
    uploadedFiles: UploadedFile[],
    lat?: number,
    lng?: number
  ) => void;
  isLoading: boolean;
  projectNotes: string;
  onProjectNotesChange: (notes: string) => void;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  addToast: (message: string, type: 'error' | 'info') => void;
}

const InputForm: React.FC<InputFormProps> = ({ 
  onEstimateRequest, 
  isLoading, 
  projectNotes, 
  onProjectNotesChange,
  uploadedFiles,
  onFilesChange,
  addToast
}) => {
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [jobName, setJobName] = useState('');
  const [supplyOption, setSupplyOption] = useState('labour_and_materials');
  const [location, setLocation] = useState('Manchester');
  const [useGrounding, setUseGrounding] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [filesBeingProcessed, setFilesBeingProcessed] = useState<string[]>([]); // New state for files being processed


  const { data: geoData, loading: geoLoading, getLocation } = useGeolocation({ 
    onError: (err) => addToast(err.message, 'error') 
  });
  const { isListening, transcript, startListening, stopListening, error: speechError } = useSpeechRecognition();
  const notesBeforeListening = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (geoData) {
      setCoords({ lat: geoData.latitude, lng: geoData.longitude });
      getPostcodeFromCoords(geoData.latitude, geoData.longitude).then(postcode => {
        if (postcode) {
          setLocation(postcode);
          addToast(`Location set to ${postcode}.`, 'info');
        } else {
          addToast('Could not determine postcode from your location.', 'error');
        }
      });
    }
  }, [geoData, addToast]);

  useEffect(() => {
    if (isListening) {
      const separator = notesBeforeListening.current ? ' ' : '';
      onProjectNotesChange(notesBeforeListening.current + separator + transcript);
    }
  }, [transcript, isListening, onProjectNotesChange]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEstimateRequest(clientName, clientAddress, jobName, supplyOption, location, useGrounding, projectNotes, uploadedFiles, coords?.lat, coords?.lng);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      notesBeforeListening.current = projectNotes;
      startListening();
    }
  };

  const handleReadAloud = () => {
    if (projectNotes) {
      speak(projectNotes);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Fix: Ensure 'fileEntry' is correctly typed as 'File' before accessing its properties.
    const newFileNames = Array.from(files).map((fileEntry: File) => fileEntry.name);
    setFilesBeingProcessed(prev => [...prev, ...newFileNames]); // Add all new files to processing state immediately

    const filePromises = Array.from(files).map(fileEntry => {
      if (!(fileEntry instanceof File)) {
        console.warn('An item in the file list was not a File object, skipping.', fileEntry);
        return Promise.resolve(null);
      }
      const file = fileEntry; // Type is now guaranteed to be File

      return new Promise<UploadedFile | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target?.result;
            if (typeof result !== 'string') {
              throw new Error(`FileReader did not return a string for file: ${file.name}`);
            }
            const base64 = result.split(',')[1];
            if (!base64) {
              throw new Error(`Could not extract base64 data from file: ${file.name}`);
            }
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              base64
            });
          } catch (error) {
            reject(error);
          } finally {
            // Remove this file from processing state after load/error
            setFilesBeingProcessed(prev => prev.filter(name => name !== file.name));
          }
        };
        reader.onerror = (err) => {
            reject(new Error(`FileReader error for file ${file.name}: ${err}`));
            // Also remove from processing state on error
            setFilesBeingProcessed(prev => prev.filter(name => name !== file.name));
        };
        reader.readAsDataURL(file);
      });
    });
    
    // Use Promise.allSettled to ensure all files are processed, even if some fail
    Promise.allSettled(filePromises).then(results => {
      const successfulFiles: UploadedFile[] = [];
      results.forEach(res => {
          if (res.status === 'fulfilled' && res.value !== null) {
              successfulFiles.push(res.value);
          } else if (res.status === 'rejected') {
              console.error("Error processing a file:", res.reason);
              addToast(res.reason.message || 'Error reading one or more files.', 'error');
          }
      });

      if (successfulFiles.length > 0) {
        onFilesChange([...uploadedFiles, ...successfulFiles]);
      }
      // Clear the file input value so the same file(s) can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const removeFile = (fileName: string) => {
    onFilesChange(uploadedFiles.filter(f => f.name !== fileName));
  };
  
  const handleLocationSearch = async () => {
      if (!location.trim()) {
          addToast('Please enter a location to search.', 'info');
          return;
      }
      setIsGeocoding(true);
      const result = await getCoordsFromAddress(location);
      if (result) {
          setCoords(result);
          addToast(`Location found on map.`, 'info');
      } else {
          setCoords(null);
          addToast(`Could not find coordinates for "${location}".`, 'error');
      }
      setIsGeocoding(false);
  };


  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-slate-300 mb-1">
            Client Name
          </label>
          <input
            type="text"
            id="clientName"
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g., John Smith"
            required
          />
        </div>
        <div>
          <label htmlFor="clientAddress" className="block text-sm font-medium text-slate-300 mb-1">
            Client Address
          </label>
          <input
            type="text"
            id="clientAddress"
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="e.g., 123 Main Street, London"
            required
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="jobName" className="block text-sm font-medium text-slate-300 mb-1">
          Job Name <span className="text-slate-400">(Optional)</span>
        </label>
        <input
          type="text"
          id="jobName"
          className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          placeholder="e.g., Rear Extension for Smith"
        />
        <p className="text-xs text-slate-500 mt-1">If left blank, a name will be generated from the project scope.</p>
      </div>
      
      {/* Form Fields... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="supply" className="block text-sm font-medium text-slate-300 mb-1">
            Supply Option
          </label>
          <select
            id="supply"
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
            value={supplyOption}
            onChange={(e) => setSupplyOption(e.target.value)}
          >
            <option value="labour_and_materials">Labour & Materials</option>
            <option value="labour_only">Labour Only</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">
            Job Site Location (UK)
          </label>
           <div className="flex">
            <input
              type="text"
              id="location"
              className="w-full bg-slate-700 text-white rounded-l-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., London or SW1A 1AA"
            />
            <button type="button" onClick={handleLocationSearch} disabled={isGeocoding || !location.trim()} className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-300 disabled:opacity-50 flex items-center justify-center">
                {isGeocoding ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <MagnifyingGlassIcon className="h-5 w-5"/>}
            </button>
            <button type="button" onClick={getLocation} disabled={geoLoading} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-r-md text-slate-300 disabled:opacity-50 flex items-center justify-center">
                {geoLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <GeoIcon className="h-5 w-5"/>}
            </button>
          </div>
        </div>
      </div>
      
      {coords && (
        <div className="mt-6 animate-fade-in">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Location Preview
          </label>
          <div className="aspect-video bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600">
            <iframe
              className="w-full h-full"
              title="Location Preview Map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.01},${coords.lng + 0.01},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      )}
      
       <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">
          Project Scope &amp; Notes
        </label>
        <div className="relative">
          <textarea
            id="notes"
            rows={5}
            className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition pr-14"
            value={projectNotes}
            onChange={(e) => onProjectNotesChange(e.target.value)}
            placeholder="Provide all project details here, e.g., 'Single storey rear extension, approx 30m² floor area.' You can also dictate notes by pressing the microphone button..."
          />
          <div className="absolute top-2 right-2 flex flex-col space-y-2">
            <button 
              type="button" 
              onClick={handleMicClick} 
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-slate-600 hover:bg-slate-500'}`}
              title={isListening ? 'Stop Dictating' : 'Dictate Notes'}
            >
              <MicrophoneIcon className="h-5 w-5 text-white" />
            </button>
            <button 
              type="button" 
              onClick={handleReadAloud} 
              className="p-2 bg-slate-600 hover:bg-slate-500 rounded-full transition-colors"
              title="Read Notes Aloud"
            >
              <SpeakerWaveIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
        {speechError && <p className="text-xs text-red-400 mt-1">{speechError}</p>}
      </div>
      
      {/* File Upload Section */}
       <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Attachments</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <PaperClipIcon className="mx-auto h-10 w-10 text-slate-500"/>
              <div className="flex text-sm text-slate-400">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-teal-400 hover:text-teal-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-teal-500">
                  <span>Upload files</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple ref={fileInputRef} onChange={handleFileChange} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-slate-500">Images, PDF, TXT up to 10MB</p>
            </div>
          </div>
           {/* Display files being processed */}
          {filesBeingProcessed.length > 0 && (
              <div className="mt-3 space-y-2">
                  {filesBeingProcessed.map(fileName => (
                      <div key={fileName} className="flex items-center justify-between bg-slate-700 p-2 rounded-md text-sm">
                          <span className="text-slate-300 truncate">{fileName}</span>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-teal-400"></div>
                      </div>
                  ))}
              </div>
          )}
          {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                  {uploadedFiles.map(file => (
                      <div key={file.name} className="flex items-center justify-between bg-slate-700 p-2 rounded-md text-sm">
                          <span className="text-slate-300 truncate">{file.name}</span>
                          <button type="button" onClick={() => removeFile(file.name)} className="text-slate-400 hover:text-red-400">
                            <TrashIcon className="h-4 w-4"/>
                          </button>
                      </div>
                  ))}
              </div>
            )}
      </div>


      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="flex items-center">
            <input
                id="use-grounding"
                type="checkbox"
                checked={useGrounding}
                onChange={(e) => setUseGrounding(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="use-grounding" className="ml-2 block text-sm text-slate-400">
                Use Google Search for latest pricing data (more accurate, slower)
            </label>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-teal-600 text-white font-bold py-2 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center min-w-[160px]"
        >
          {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Generate Estimate'}
        </button>
      </div>
    </form>
  );
};

export default InputForm;
