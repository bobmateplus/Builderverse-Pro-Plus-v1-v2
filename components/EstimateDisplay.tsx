import React from 'react';
import { GlobeIcon } from './icons';
// Fix: Import EstimateResult type for props.
import { EstimateResult, FormattedSource } from '../types';

interface EstimateDisplayProps {
  // Fix: Use the more specific EstimateResult type.
  result: EstimateResult | null;
  // Fix: Make onSave optional to allow this component to be used for viewing existing jobs.
  onSave: () => void;
}

const EstimateDisplay: React.FC<EstimateDisplayProps> = ({ result, onSave }) => {
  if (!result) {
    return null;
  }
  
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table handler
      if (line.includes('|')) {
        if (!inTable) {
          // Starting a new table
          inTable = true;
          const tableRows = [];
          let currentLine = i;
          
          // Look ahead for all table rows
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
            i = currentLine - 1; // Move index past the processed table lines
          } else {
             // Not a valid table, render as paragraph
             inTable = false;
             elements.push(<p key={i} className="my-1.5 text-slate-300">{line}</p>)
          }
        }
        continue; // continue to next line after processing table or single pipe line
      } else {
        inTable = false; // exiting table mode
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
        elements.push(<pre key={i} className="bg-slate-900 p-3 rounded-md my-2 text-sm text-slate-300 overflow-x-auto"><code>{line.replace(/```/g, '')}</code></pre>)
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

  return (
    <div className="mt-8 bg-slate-800 p-6 rounded-lg shadow-xl animate-fade-in">
      <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-white">
          Estimate Details
        </h2>
        {/* Fix: Only render the save button if the onSave prop is provided. */}
        {onSave && (
          <button
            onClick={onSave}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
          >
            Save as Job
          </button>
        )}
      </div>
      
      <div className="prose prose-invert prose-slate max-w-none">
         {renderMarkdown(result.markdown)}
      </div>

      {result.sources && result.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h3 className="flex items-center text-lg font-semibold text-slate-300 mb-2">
            <GlobeIcon className="h-5 w-5 mr-2" />
            Data Sources (from Google)
          </h3>
          <ul className="space-y-2">
            {result.sources.map((source, index) => (
              <li key={index} className="text-sm">
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 hover:underline truncate block"
                  title={source.title}
                >
                  {index + 1}. {source.title} ({source.type === 'web' ? 'Web Search' : 'Google Maps'})
                </a>
                {source.type === 'map' && source.reviewSnippets && source.reviewSnippets.length > 0 && (
                  <ul className="ml-4 mt-1 space-y-1 text-xs text-slate-500">
                    {source.reviewSnippets.map((snippet, sIndex) => (
                      <li key={`${index}-${sIndex}`}>
                         &bull; Review: <a
                            href={snippet.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            title={snippet.title}
                          >{snippet.title}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EstimateDisplay;