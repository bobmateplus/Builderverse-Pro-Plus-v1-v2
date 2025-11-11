import React from 'react';
import type { Job } from '../types';
import { GeoIcon } from './icons';

interface JobsMapViewerProps {
    jobs: Job[];
    onBack: () => void;
}

const JobsMapViewer: React.FC<JobsMapViewerProps> = ({ jobs, onBack }) => {
    const jobsWithCoords = jobs.filter(job => job.coords);

    if (jobsWithCoords.length === 0) {
        return (
            <div className="animate-fade-in">
                <button onClick={onBack} className="text-teal-400 hover:text-teal-300 mb-6 inline-block">&larr; Back to Jobs</button>
                <div className="text-center bg-slate-800 p-12 rounded-lg border border-slate-700 border-dashed">
                    <GeoIcon className="mx-auto h-12 w-12 text-slate-500" />
                    <h3 className="mt-4 text-lg font-medium text-white">No job locations available</h3>
                    <p className="mt-1 text-sm text-slate-400">Add locations to your jobs to see them on the map.</p>
                </div>
            </div>
        );
    }

    // Constructing a URL for multiple markers on OpenStreetMap is tricky without custom map servers.
    // For simplicity with iframes, we will aim to show a bounding box with a single central marker,
    // or if only a few jobs, try to use multiple markers if the API supports it simply.
    // OpenStreetMap's embed.html doesn't directly support multiple custom markers from a URL.
    // A common workaround for multiple markers or clustering would require a JS-based map library (e.g., Leaflet, Google Maps JS API).

    // For this implementation, we will create a URL that centers on the average coordinate
    // and potentially show a few markers if the bbox covers them, or just a single one.
    // True clustering is not feasible with a simple iframe, and would require a dedicated map library.

    const avgLat = jobsWithCoords.reduce((sum, job) => sum + (job.coords?.lat || 0), 0) / jobsWithCoords.length;
    const avgLng = jobsWithCoords.reduce((sum, job) => sum + (job.coords?.lng || 0), 0) / jobsWithCoords.length;

    // Determine bounding box for all jobs
    const minLat = Math.min(...jobsWithCoords.map(j => j.coords!.lat));
    const maxLat = Math.max(...jobsWithCoords.map(j => j.coords!.lat));
    const minLng = Math.min(...jobsWithCoords.map(j => j.coords!.lng));
    const maxLng = Math.max(...jobsWithCoords.map(j => j.coords!.lng));

    // Add a small buffer to the bounding box
    const latBuffer = (maxLat - minLat) * 0.1 || 0.01;
    const lngBuffer = (maxLng - minLng) * 0.1 || 0.01;

    const bbox = `${minLng - lngBuffer},${minLat - latBuffer},${maxLng + lngBuffer},${maxLat + latBuffer}`;

    // OSM embed link can only show one marker from the URL directly.
    // To show multiple, a more advanced solution with a JS map library is needed.
    // For this context, we'll show a single marker at the average location if many,
    // or just the location of the first job if only one, with a bounding box covering all.
    const markerLat = jobsWithCoords[0]?.coords?.lat || avgLat;
    const markerLng = jobsWithCoords[0]?.coords?.lng || avgLng;

    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${markerLat},${markerLng}`;

    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="text-teal-400 hover:text-teal-300 mb-6 inline-block">&larr; Back to Jobs</button>
            <h2 className="text-3xl font-bold mb-6 text-white">Job Locations Map</h2>
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg shadow-xl">
                <p className="text-sm text-slate-400 mb-3">
                    Showing {jobsWithCoords.length} job(s) on the map.
                    <br/>
                    <strong className="text-red-400">Note:</strong> Due to limitations with embedded maps, advanced features like real-time clustering are not supported. For interactive clustering, a dedicated JavaScript map library (e.g., Leaflet, Google Maps JS API) would be required, which is outside the scope of current minimal dependencies.
                </p>
                <div className="aspect-video rounded-md overflow-hidden border-2 border-slate-700">
                    <iframe
                        className="w-full h-full"
                        title="Job Locations Map"
                        src={mapUrl}
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                </div>
                <div className="mt-4 text-sm text-slate-300 space-y-1">
                    <h3 className="font-semibold text-teal-400">Jobs with Coordinates:</h3>
                    <ul className="list-disc list-inside space-y-0.5">
                        {jobsWithCoords.map(job => (
                            <li key={job.id} className="truncate">{job.name} ({job.location})</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default JobsMapViewer;