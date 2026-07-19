import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, AlertTriangle, CheckCircle, Trash2, HelpCircle, FileSpreadsheet } from 'lucide-react';

interface Team {
  name: string;
  code?: string;
  captainName?: string;
}

interface ExcelUploadProps {
  tournamentId: string;
  sport: string;
  onImportSuccess: () => void;
}

export const ExcelUpload = ({ tournamentId, sport, onImportSuccess }: ExcelUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewTeams, setPreviewTeams] = useState<Team[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    setLoading(true);
    setErrors([]);
    setErrorMessage('');
    setSuccess(false);
    setPreviewTeams([]);

    const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'xlsx' && fileType !== 'xls' && fileType !== 'csv') {
      setErrorMessage('Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
      setLoading(false);
      return;
    }

    setFile(selectedFile);

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        // POST to upload preview endpoint
        const response = await axios.post(`/api/tournaments/${tournamentId}/teams/upload`, {
          file: base64Data,
          fileName: selectedFile.name,
          sport,
        });

        const data = response.data;
        setPreviewTeams(data.teams || []);
        setErrors(data.errors || []);
        setSuccess(data.success);
      } catch (err: any) {
        console.error('Error uploading team spreadsheet:', err);
        setErrorMessage(err.response?.data?.message || 'Error processing spreadsheet file.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading the local spreadsheet file.');
      setLoading(false);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSaveTeams = async () => {
    if (previewTeams.length === 0 || !success) return;

    setLoading(true);
    try {
      await axios.post(`/api/tournaments/${tournamentId}/teams/batch`, {
        teams: previewTeams,
        sport,
      });
      // Clear states and invoke parent update callback
      setFile(null);
      setPreviewTeams([]);
      setSuccess(false);
      onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save imported teams to database.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewTeams([]);
    setErrors([]);
    setSuccess(false);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Upload Drag and Drop Zone */}
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-gold-primary bg-gold-primary/5 shadow-gold-glow'
              : 'border-obsidian-light hover:border-gold-primary/30 hover:bg-obsidian-light/20 bg-obsidian-card'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <UploadCloud className="h-10 w-10 text-gold-primary mb-3" />
          <h4 className="text-sm font-bold text-ivory-primary">Import Teams spreadsheet</h4>
          <p className="text-xs text-ivory-muted mt-1 max-w-xs mx-auto">
            Drag and drop your Excel (.xlsx, .xls) or CSV file here, or click to browse.
          </p>
          <div className="mt-4 flex items-center gap-1 text-[10px] text-ivory-dark">
            <HelpCircle className="h-3 w-3" />
            Expected columns: "Team Name" (required), "Code", "Captain Name"
          </div>
        </div>
      ) : (
        /* Preview / Validation Section */
        <div className="rounded-xl border border-obsidian-light bg-obsidian-card p-5">
          <div className="flex items-center justify-between border-b border-obsidian-light/50 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-gold-primary" />
              <div>
                <h4 className="text-sm font-bold text-ivory-primary truncate max-w-xs">{file.name}</h4>
                <p className="text-[10px] text-ivory-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              disabled={loading}
              className="flex items-center gap-1 rounded bg-obsidian-light hover:bg-obsidian-accent text-xs font-semibold text-ivory-muted hover:text-crimson-primary px-2.5 py-1 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear file
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border border-t-gold-primary border-r-transparent border-b-transparent border-l-transparent" />
              <span className="text-xs text-ivory-muted mt-2">Processing spreadsheet data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error messages */}
              {errorMessage && (
                <div className="rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 p-3 text-xs text-crimson-primary">
                  {errorMessage}
                </div>
              )}

              {/* Parsing Issues (Warnings / Duplicates) */}
              {errors.length > 0 && (
                <div className="rounded-lg border border-crimson-primary/20 bg-crimson-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-crimson-primary">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Spreadsheet Parsing Warnings ({errors.length})
                  </div>
                  <ul className="text-[11px] text-ivory-muted list-disc list-inside max-h-32 overflow-y-auto space-y-1">
                    {errors.map((err, idx) => (
                      <li key={idx} className="leading-relaxed">{err}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-ivory-dark mt-1">
                    Please correct the spreadsheet rows and re-upload to ensure database seeding works.
                  </p>
                </div>
              )}

              {/* Preview Teams Table */}
              {previewTeams.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ivory-primary flex items-center gap-1">
                      <CheckCircle className={`h-4 w-4 ${success ? 'text-emerald-400' : 'text-ivory-dark'}`} />
                      Ready to Seed: {previewTeams.length} Team(s)
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-obsidian-light rounded-lg">
                    <table className="min-w-full divide-y divide-obsidian-light/50 text-left text-xs text-ivory-muted">
                      <thead className="bg-obsidian-dark text-[10px] font-bold text-gold-primary uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="px-4 py-2">#</th>
                          <th className="px-4 py-2">Team Name</th>
                          <th className="px-4 py-2">Abbr Code</th>
                          <th className="px-4 py-2">Captain</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-obsidian-light/30 bg-obsidian-card/45 font-sans">
                        {previewTeams.map((t, idx) => (
                          <tr key={idx} className="hover:bg-obsidian-light/30">
                            <td className="px-4 py-2 text-ivory-dark font-medium">{idx + 1}</td>
                            <td className="px-4 py-2 text-ivory-primary font-semibold">{t.name}</td>
                            <td className="px-4 py-2">{t.code || '—'}</td>
                            <td className="px-4 py-2">{t.captainName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {success && (
                    <button
                      onClick={handleSaveTeams}
                      disabled={loading}
                      className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-bold text-black focus:outline-none transition-colors"
                    >
                      Import & Save Teams
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ExcelUpload;
