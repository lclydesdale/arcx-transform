
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { fetchAirtableRecords } from './airtableService';
import { AirtableRecord, AirtableFields } from './types';
import IndividualDashboard from './components/IndividualDashboard';
import LoginPage from './components/LoginPage';
import AIRoadmap from './components/AIRoadmap';
import { Users, FileText, Search, Loader2, AlertCircle, RefreshCw, ArrowRight, LogOut } from 'lucide-react';

const DashboardList: React.FC<{ records: AirtableRecord[], loading: boolean, error: string | null, onRefresh: () => void }> = ({ records, loading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(record => 
    record.fields.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.fields.Title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.fields["Department/Team"]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-brand-active animate-spin mb-4" />
        <p className="text-brand-dark font-extrabold uppercase tracking-widest text-xs">Syncing with Airtable Database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="w-16 h-16 text-brand-accent mb-4" />
        <h2 className="text-2xl font-serif text-black mb-2">Connection Error</h2>
        <p className="text-black/60 max-w-md mb-8">{error}</p>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs rounded-none shadow-[4px_4px_0px_0px_rgba(169,236,247,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:py-20 md:px-6">
      <header className="mb-12 md:mb-20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-1 bg-brand-accent"></div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.5em] text-black/40">Audit Directory</span>
          </div>
          <Link to="/" className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-black/40 hover:text-brand-accent transition-colors">
            <LogOut className="w-3 h-3" /> Sign Out
          </Link>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-6xl font-serif text-black mb-4">Role & AI Audits</h1>
            <p className="text-base md:text-lg font-serif italic text-black/60 max-w-xl">
              Professional performance and automation assessment records for team distribution and strategy alignment.
            </p>
          </div>
          <div className="relative w-full md:w-auto md:min-w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, team or role..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-black rounded-none focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(255,105,62,1)] transition-all placeholder:text-black/20 font-bold uppercase text-[10px] tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1px bg-black border border-black shadow-2xl">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record, index) => (
            <Link 
              key={record.id} 
              to={`/dashboard/${record.id}`}
              className="group block bg-white p-8 hover:bg-brand-cream transition-all relative"
            >
              <div className="flex justify-between items-start mb-12">
                <span className="text-[10px] font-extrabold text-black/20 uppercase tracking-widest">
                  Record #{String(index + 1).padStart(2, '0')}
                </span>
                <div className={`w-3 h-3 rounded-none ${index % 3 === 0 ? 'bg-brand-blue' : index % 3 === 1 ? 'bg-brand-yellow' : 'bg-brand-green'}`}></div>
              </div>
              
              <div className="mb-12">
                <h2 className="text-3xl font-serif text-black group-hover:text-brand-accent transition-colors mb-2">
                  {record.fields.Name || 'Anonymous'}
                </h2>
                <p className="text-xs font-extrabold text-brand-dark uppercase tracking-widest">
                  {record.fields.Title || 'Role Title'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-brand-cream border border-black/10 text-[8px] font-extrabold uppercase tracking-widest">
                  {record.fields["Department/Team"] || 'Internal'}
                </span>
                <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white">
            <p className="font-serif italic text-black/40 text-2xl">No matching records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardDetail: React.FC<{ records: AirtableRecord[], onRecordUpdate: (id: string, fields: Partial<AirtableFields>) => void }> = ({ records, onRecordUpdate }) => {
  const { id } = useParams<{ id: string }>();
  const record = records.find(r => r.id === id);

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-serif mb-4">Record Not Found</h2>
        <Link to="/" className="text-brand-accent uppercase font-bold tracking-widest text-xs hover:underline">Return to Access Portal</Link>
      </div>
    );
  }

  return <IndividualDashboard record={record} onRecordUpdate={onRecordUpdate} />;
};

const App: React.FC = () => {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAirtableRecords();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with Airtable.');
    } finally {
      setLoading(false);
    }
  };

  const updateRecordLocally = (id: string, updatedFields: Partial<AirtableFields>) => {
    setRecords(prev => prev.map(record => 
      record.id === id 
        ? { ...record, fields: { ...record.fields, ...updatedFields } }
        : record
    ));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <HashRouter>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LoginPage records={records} loading={loading} />} />
          <Route path="/admin" element={<DashboardList records={records} loading={loading} error={error} onRefresh={loadData} />} />
          <Route path="/dashboard/:id" element={<DashboardDetail records={records} onRecordUpdate={updateRecordLocally} />} />
          <Route path="/roadmap/:id" element={<AIRoadmap records={records} onRecordUpdate={updateRecordLocally} />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
