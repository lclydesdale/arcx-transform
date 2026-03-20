
import React, { useRef, useState, useEffect } from 'react';
import { AirtableRecord, AirtableFields } from '../types';
import DashboardCard from './DashboardCard';
import BulletList from './BulletList';
import { Download, Loader2, Sparkles, AlertCircle, LogOut, ArrowRight, X, Info, CheckCircle2, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { updateAirtableRecord } from '../services/airtableService';

interface IndividualDashboardProps {
  record: AirtableRecord;
  onRecordUpdate?: (id: string, fields: Partial<AirtableFields>) => void;
}

const FIELD_KEYS = [
  "Top time-consuming tasks",
  "Creative, strategic, or analytical tasks",
  "People tasks and skills",
  "Tech Stack",
  "Tech Friction",
  "Work Chores",
  "Emergent Skill Development",
  "Work Backlog (opportunity cost)",
  "AI Wins",
  "Possible AI Hand off",
  "AI Native Ideas",
  "Job Description Comparison"
];

const IndividualDashboard: React.FC<IndividualDashboardProps> = ({ record, onRecordUpdate }) => {
  const fields = record.fields;
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRefining, setIsRefining] = useState(true);
  const [refinedFields, setRefinedFields] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showPreFeedbackNotice, setShowPreFeedbackNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const isJDMissing = fields["Job Description Comparison"]?.includes("No matching job description was found") || 
                      fields["Job Description Comparison"]?.includes("Comparison could not be performed");
  
  const hasSubmittedFeedback = !!(fields.Feedback_MainAIFocus || fields.Feedback_NextAIWin || fields.Feedback_GeneralComments);
  const hasRoadmap = !!(fields.AI_AugmentationPlan || fields.Roadmap_JSON);

  // Feedback form state
  const [feedbackData, setFeedbackData] = useState<Partial<AirtableFields>>({
    Feedback_MissingWork: fields.Feedback_MissingWork || "",
    Feedback_AdditionalTools: fields.Feedback_AdditionalTools || "",
    Feedback_EnjoyableWork: fields.Feedback_EnjoyableWork || "",
    Feedback_BacklogBlockers: fields.Feedback_BacklogBlockers || "",
    Feedback_PersonalJudgment: fields.Feedback_PersonalJudgment || "",
    Feedback_ToolReplacement: fields.Feedback_ToolReplacement || "",
    Feedback_TechWorkarounds: fields.Feedback_TechWorkarounds || "",
    Feedback_InevitableChores: fields.Feedback_InevitableChores || "",
    Feedback_NextAIWin: fields.Feedback_NextAIWin || "",
    Feedback_MainAIFocus: fields.Feedback_MainAIFocus || "",
    Feedback_GeneralComments: fields.Feedback_GeneralComments || ""
  });

  const navigate = useNavigate();

  const handleFieldChange = (key: keyof AirtableFields, value: string) => {
    setFeedbackData(prev => ({ ...prev, [key]: value }));
  };

  const getRawBullets = (key: string): string[] => {
    const val = (fields as any)[key];
    if (!val) return [];
    return String(val)
      .split(/\n|,|;/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  useEffect(() => {
    const refineContent = async () => {
      try {
        setIsRefining(true);
        setError(null);

        if (fields.Refined_JSON) {
          try {
            const cachedData = JSON.parse(fields.Refined_JSON);
            const hasData = Object.values(cachedData).some((arr: any) => Array.isArray(arr) && arr.length > 0);
            if (hasData) {
              setRefinedFields(cachedData);
              setIsRefining(false);
              return;
            }
          } catch (e) {
            console.warn("Invalid Refined_JSON format, regenerating...");
          }
        }

        const contentToRefine = FIELD_KEYS.reduce((acc, key) => {
          const val = (fields as any)[key];
          if (val) acc[key] = val;
          return acc;
        }, {} as Record<string, string>);

        if (Object.keys(contentToRefine).length === 0) {
          setIsRefining(false);
          return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `You are a professional business analyst. I am providing you with raw data from a "Role & AI Audit". 
          
          TASK:
          - Transform raw text into professional, impactful, high-density bullet points.
          - CRITICAL: DO NOT OMIT ANY INFORMATION. Every tool and task mentioned MUST be included.
          - Aim for 3-5 high-quality bullets per category to fill the dashboard space effectively. 
          - Ensure sentences are descriptive but not excessively wordy (target 8-15 words per bullet).
          - Maintain a sophisticated executive tone.
          - Ensure the JSON output contains an array for EVERY requested key.
          
          DATA TO PROCESS:
          ${JSON.stringify(contentToRefine)}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: FIELD_KEYS.reduce((acc, key) => {
                acc[key] = { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }
                };
                return acc;
              }, {} as any)
            }
          }
        });

        const result = JSON.parse(response.text || "{}");
        
        const mergedResult = { ...result };
        FIELD_KEYS.forEach(key => {
          if ((!mergedResult[key] || mergedResult[key].length === 0) && (fields as any)[key]) {
            mergedResult[key] = getRawBullets(key);
          }
        });

        setRefinedFields(mergedResult);

        const refinedJsonString = JSON.stringify(mergedResult);
        await updateAirtableRecord(record.id, { "Refined_JSON": refinedJsonString });
        if (onRecordUpdate) {
          onRecordUpdate(record.id, { "Refined_JSON": refinedJsonString });
        }

      } catch (err: any) {
        console.error("Refinement failed:", err);
        setError("AI optimization failed. Showing raw data.");
        const fallback: Record<string, string[]> = {};
        FIELD_KEYS.forEach(key => {
          fallback[key] = getRawBullets(key);
        });
        setRefinedFields(fallback);
      } finally {
        setIsRefining(false);
      }
    };

    refineContent();
  }, [record.id, fields.Refined_JSON]);

  const getList = (key: string) => {
    const refined = refinedFields[key];
    if (refined && refined.length > 0) return refined;
    return getRawBullets(key);
  };

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsDownloading(true);
      const element = dashboardRef.current;
      const safeName = (fields.Name || 'Participant').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const opt = {
        margin: 0,
        filename: `${safeName}_role_audit.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true, backgroundColor: '#FFFFFF' },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' }
      };
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleProceedToReview = () => {
    if (showFeedback) {
      setShowFeedback(false);
    } else {
      setShowPreFeedbackNotice(true);
    }
  };

  const confirmProceedToReview = () => {
    setShowPreFeedbackNotice(false);
    setShowFeedback(true);
  };

  const handleFeedbackSubmit = async () => {
    // Validation: Ensure all fields are filled
    const requiredFields: (keyof AirtableFields)[] = [
      "Feedback_MissingWork",
      "Feedback_AdditionalTools",
      "Feedback_EnjoyableWork",
      "Feedback_BacklogBlockers",
      "Feedback_PersonalJudgment",
      "Feedback_ToolReplacement",
      "Feedback_TechWorkarounds",
      "Feedback_InevitableChores",
      "Feedback_NextAIWin",
      "Feedback_MainAIFocus",
      "Feedback_GeneralComments"
    ];

    const isFormIncomplete = requiredFields.some(field => !feedbackData[field] || String(feedbackData[field]).trim() === "");

    if (isFormIncomplete) {
      setError("Please ensure all fields on the feedback and review form have been filled out before proceeding.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateAirtableRecord(record.id, feedbackData);
      if (onRecordUpdate) {
        onRecordUpdate(record.id, feedbackData);
      }
      setSaveSuccess(true);
      // Automatically navigate to roadmap on successful save
      navigate(`/roadmap/${record.id}`);
    } catch (err: any) {
      console.error("Save failed:", err);
      setError("Connection error: Failed to sync feedback with database. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className={`min-h-screen transition-colors ${showFeedback ? 'bg-white' : 'pb-20 bg-brand-cream'}`}>
      {showPreFeedbackNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-2 border-black p-8 lg:p-12 max-w-2xl w-full shadow-[12px_12px_0px_0px_rgba(255,105,62,1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-brand-accent"></div>
            <div className="flex gap-6 items-start mb-8">
              <div className="w-12 h-12 bg-brand-accent/10 flex items-center justify-center rounded-none shrink-0 border border-brand-accent/20">
                <Info className="w-6 h-6 text-brand-accent" />
              </div>
              <div>
                <p className="text-xl lg:text-2xl font-serif text-black leading-relaxed">
                  This dashboard reflects how your work shows up today. The goal of the questions that follow is to help leadership make good decisions about work design, capability investment, and risk—not to evaluate individual performance.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setShowPreFeedbackNotice(false)}
                className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmProceedToReview}
                className="flex items-center gap-3 px-8 py-4 bg-black text-white font-extrabold uppercase tracking-[0.2em] text-[10px] shadow-[4px_4px_0px_0px_rgba(169,236,247,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                I Understand & Proceed
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-[100vw] mx-auto p-4 flex items-center justify-between no-print border-b border-black/5 bg-white sticky top-0 z-50`}>
        <div className="flex gap-4">
          <Link to="/" className="flex items-center gap-2 text-black/40 hover:text-brand-accent font-bold uppercase tracking-widest text-[10px]">
            <LogOut className="w-3 h-3" /> Sign Out
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isRefining && <span className="text-[10px] font-extrabold text-brand-active animate-pulse uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Optimizing...
          </span>}
          {error && <span className="text-[10px] font-extrabold text-brand-accent uppercase tracking-widest flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>}
          {!showFeedback && (
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading || isRefining}
              className="flex items-center gap-2 px-5 py-2 bg-white border border-black text-black font-bold uppercase tracking-widest text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
          )}
          <button 
            onClick={handleProceedToReview}
            className={`flex items-center gap-2 px-6 py-2 ${showFeedback ? 'bg-black text-white' : 'bg-brand-accent text-white'} font-bold uppercase tracking-widest text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all`}
          >
            {showFeedback ? (
              <>
                <X className="w-4 h-4" />
                Close Feedback
              </>
            ) : (
              <>
                Feedback & Review
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className={`flex ${showFeedback ? 'flex-col lg:flex-row items-start lg:h-[calc(100vh-73px)] overflow-hidden' : 'justify-center min-h-screen'} w-full transition-all duration-500`}>
        <div className={`transition-all duration-500 relative flex justify-center ${showFeedback ? 'w-full lg:w-[66.66%] border-b-2 lg:border-b-0 lg:border-r-2 border-black/10 overflow-y-auto bg-brand-cream/5 h-auto lg:h-full py-12 scrollbar-thin' : 'px-4'}`}>
          <div 
            ref={dashboardRef} 
            className={`dashboard-container shadow-none transition-transform duration-500 ${showFeedback ? 'scale-100 lg:scale-[1.15] origin-top' : 'p-6 print:p-0'}`}
          >
            {isRefining ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand-active animate-spin" />
              </div>
            ) : (
              <div className="dashboard-content flex flex-col h-full gap-2.5 overflow-hidden">
                <header className="flex justify-between items-end border-b-[3px] border-black pb-2">
                  <div className="flex-1">
                    <h1 className="text-4xl font-serif text-black leading-none mb-1 tracking-tighter">
                      {fields.Name || 'Record Name'}
                    </h1>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-right">
                      <div className="w-12 h-1.5 bg-brand-accent ml-auto mb-1"></div>
                      <p className="text-[8px] font-extrabold text-black uppercase tracking-[0.3em] leading-none">Role Strategy Audit</p>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr] gap-2.5 flex-grow overflow-hidden items-stretch">
                  <div className="flex flex-col gap-2 h-full overflow-hidden">
                    <DashboardCard numberText="01" title="Motivation & Flow" subtitle="Performance Drivers" variant="outline" className="flex-grow">
                      <BulletList items={getList("Creative, strategic, or analytical tasks")} />
                    </DashboardCard>

                    <DashboardCard numberText="02" title="Strategic Backlog" variant="accent-blue" className="flex-grow">
                      <BulletList items={getList("Work Backlog (opportunity cost)")} prefix="→" />
                    </DashboardCard>

                    <DashboardCard numberText="03" title="Skill Evolution" variant="outline" className="flex-grow">
                      <BulletList items={getList("Emergent Skill Development")} />
                    </DashboardCard>

                    <DashboardCard numberText="04" title="Tech Maturity" variant="accent-yellow" className="flex-grow-[1.2]">
                      <div className="mb-2">
                        <p className="text-[7.5px] font-extrabold uppercase mb-1 text-black/40 tracking-widest">Tooling Stack</p>
                        <BulletList items={getList("Tech Stack")} />
                      </div>
                      <div>
                        <p className="text-[7.5px] font-extrabold uppercase mb-1 text-brand-accent tracking-widest">Efficiency Blockers</p>
                        <BulletList items={getList("Tech Friction")} prefix="!" />
                      </div>
                    </DashboardCard>
                  </div>

                  <div className="flex flex-col h-full overflow-hidden">
                    <DashboardCard 
                      numberText="05" 
                      title="Core of Your Work" 
                      variant="cream"
                      className="shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] border-2 h-full"
                    >
                      <div className="flex flex-col gap-8 pt-1 h-full overflow-hidden">
                        <section>
                          <h4 className="text-[9px] font-extrabold text-brand-dark uppercase tracking-[0.2em] mb-1.5 border-l-[3px] border-brand-accent pl-2">Work Chores</h4>
                          <BulletList items={getList("Work Chores")} prefix="-" />
                        </section>
                        <section>
                          <h4 className="text-[9px] font-extrabold text-brand-dark uppercase tracking-[0.2em] mb-1.5 border-l-[3px] border-brand-accent pl-2">Collaboration & Soft Skills</h4>
                          <BulletList items={getList("People tasks and skills")} />
                        </section>
                        <section>
                          <h4 className="text-[9px] font-extrabold text-brand-dark uppercase tracking-[0.2em] mb-1.5 border-l-[3px] border-brand-accent pl-2">Time Consuming Tasks</h4>
                          <BulletList items={getList("Top time-consuming tasks")} />
                        </section>
                      </div>
                    </DashboardCard>
                  </div>

                  <div className="flex flex-col gap-2 h-full overflow-hidden">
                    <DashboardCard numberText="06" title="AI Maturity" variant="dark" className="flex-grow">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[7.5px] font-extrabold text-brand-green uppercase tracking-[0.15em] mb-1.5 opacity-90">Assessment Summary</h4>
                          <p className="text-[10px] italic leading-relaxed text-white/80 font-serif">
                            {fields["AI Tool Usage"] || 'In Review'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-[7.5px] font-extrabold text-brand-green uppercase tracking-[0.15em] mb-1.5 opacity-90">Efficiency Wins</h4>
                          <BulletList items={getList("AI Wins")} />
                        </div>
                      </div>
                    </DashboardCard>

                    <DashboardCard numberText="07" title="AI Opportunity" variant="accent-green" className="flex-grow">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[7.5px] font-extrabold text-brand-dark uppercase tracking-[0.15em] mb-1.5">Automation High-Value</h4>
                          <BulletList items={getList("Possible AI Hand off")} prefix="+" />
                        </div>
                        <div>
                          <h4 className="text-[7.5px] font-extrabold text-brand-dark uppercase tracking-[0.15em] mb-1.5">Untapped AI Opportunities</h4>
                          <BulletList items={getList("AI Native Ideas")} />
                        </div>
                      </div>
                    </DashboardCard>
                  </div>
                </div>

                <footer className="flex justify-between items-end border-t-[3px] border-black pt-2 pb-1 mt-auto flex-shrink-0">
                  <div className="text-[8px] font-extrabold uppercase tracking-[0.4em] text-black/25">
                    ARCx Analytics | Role Strategy Audit | {currentYear}
                  </div>
                  <div className="flex gap-8">
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[7px] font-extrabold uppercase text-black/20 mb-0.5 tracking-[0.1em]">Data Integrity</p>
                      <p className="text-[10px] font-bold uppercase leading-none">Verified</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[7px] font-extrabold uppercase text-black/20 mb-0.5 tracking-[0.1em]">Sensitivity</p>
                      <p className="text-[10px] font-bold uppercase text-brand-accent leading-none">Internal Use</p>
                    </div>
                  </div>
                </footer>
              </div>
            )}
          </div>
        </div>

        {showFeedback && (
          <div className="w-full lg:w-[33.33%] p-6 lg:p-12 animate-in fade-in slide-in-from-right duration-500 bg-white h-auto lg:h-full overflow-y-auto border-t lg:border-t-0 lg:border-l border-black/10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
            <div className="max-w-xl mx-auto">
              <div className="inline-block w-12 h-1 bg-brand-accent mb-6"></div>
              <h2 className="text-3xl lg:text-4xl font-serif text-black mb-6">Feedback & Review</h2>
              <p className="text-sm lg:text-base font-serif italic text-black/60 mb-10 leading-relaxed">
                Thank you for reviewing your Role Strategy Audit. Please provide your insights below to finalize the strategy.
              </p>
              
              <div className="space-y-12">
                {/* Corrections and Validation */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-brand-accent">Corrections and Validation</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">Is there any work you do regularly that, upon reflection, is missing or underrepresented here?</p>
                      <textarea 
                        value={feedbackData.Feedback_MissingWork}
                        onChange={(e) => handleFieldChange("Feedback_MissingWork", e.target.value)}
                        className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                      ></textarea>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">Upon reviewing this list under AI Maturity section - and upon reflection - are there any additional tools or agents you are using not listed here?</p>
                      <textarea 
                        value={feedbackData.Feedback_AdditionalTools}
                        onChange={(e) => handleFieldChange("Feedback_AdditionalTools", e.target.value)}
                        className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                      ></textarea>
                    </div>
                  </div>
                </section>

                {/* Motivation & Flow */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(169,236,247,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-active">Motivation & Flow</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What is the work that you most enjoy doing that is directly needed in your role?</p>
                    <textarea 
                      value={feedbackData.Feedback_EnjoyableWork}
                      onChange={(e) => handleFieldChange("Feedback_EnjoyableWork", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* Strategic Backlog */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,105,62,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-accent">Strategic Backlog</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What is getting in the way of your strategic backlog? For example, time, resources, skills available, or uncertainty about how to start this work?</p>
                    <textarea 
                      value={feedbackData.Feedback_BacklogBlockers}
                      onChange={(e) => handleFieldChange("Feedback_BacklogBlockers", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* Skills */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(169,236,247,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-active">Skills</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">“Which parts of your role rely most on your personal judgment, critical thinking, context, or relationships?”</p>
                    <textarea 
                      value={feedbackData.Feedback_PersonalJudgment}
                      onChange={(e) => handleFieldChange("Feedback_PersonalJudgment", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* Tech Maturity */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,250,180,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-black/40">Tech Maturity</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What tools are being used out of habit but may need replacement, upgrade, or sunsetting?</p>
                      <textarea 
                        value={feedbackData.Feedback_ToolReplacement}
                        onChange={(e) => handleFieldChange("Feedback_ToolReplacement", e.target.value)}
                        className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                      ></textarea>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What are your mitigations or workarounds for any technical efficiency issues that are out of your control?</p>
                      <textarea 
                        value={feedbackData.Feedback_TechWorkarounds}
                        onChange={(e) => handleFieldChange("Feedback_TechWorkarounds", e.target.value)}
                        className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                      ></textarea>
                    </div>
                  </div>
                </section>

                {/* Work Chores */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-dark">Work Chores</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What chores are inevitable and can’t be avoided - they need to be done and be done by you?</p>
                    <textarea 
                      value={feedbackData.Feedback_InevitableChores}
                      onChange={(e) => handleFieldChange("Feedback_InevitableChores", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* AI Maturity */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(223,255,190,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-dark">AI Maturity</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">What is one small thing you can do tomorrow to build upon this/these AI win(s) to gain more efficiency, creativity, or strategic output?</p>
                    <textarea 
                      value={feedbackData.Feedback_NextAIWin}
                      onChange={(e) => handleFieldChange("Feedback_NextAIWin", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* AI Opportunity */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(223,255,190,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-brand-dark">AI Opportunity</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">Seeing the opportunities you have outlined, what is the one thing you would focus your attention on to improve the outcomes of your work?</p>
                    <textarea 
                      value={feedbackData.Feedback_MainAIFocus}
                      onChange={(e) => handleFieldChange("Feedback_MainAIFocus", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[80px] resize-none"
                    ></textarea>
                  </div>
                </section>

                {/* Other Comments */}
                <section className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 text-black/40">Final Thoughts</h3>
                  <div>
                    <p className="text-[12px] font-bold leading-relaxed text-black/70 mb-2">Any other comments you want to make about this dashboard or role?</p>
                    <textarea 
                      value={feedbackData.Feedback_GeneralComments}
                      onChange={(e) => handleFieldChange("Feedback_GeneralComments", e.target.value)}
                      className="w-full p-3 bg-brand-cream/30 border border-black/10 focus:outline-none focus:border-black text-[11px] font-medium min-h-[100px] resize-none"
                    ></textarea>
                  </div>
                </section>
              </div>

              <div className="mt-16 mb-20 flex flex-col gap-4">
                {error && (
                  <div className="p-4 bg-brand-accent/10 border border-brand-accent text-brand-accent text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                {isSaving ? (
                  <button 
                    disabled
                    className="w-full py-5 bg-black text-white opacity-50 font-extrabold uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing to Database...
                  </button>
                ) : (saveSuccess || hasRoadmap || hasSubmittedFeedback) ? (
                  <button 
                    onClick={() => navigate(`/roadmap/${record.id}`)}
                    className="w-full py-5 bg-brand-blue text-black font-extrabold uppercase tracking-[0.3em] text-[11px] shadow-[6px_6px_0px_0px_rgba(255,105,62,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3"
                  >
                    <Zap className="w-4 h-4" />
                    View Roadmap
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleFeedbackSubmit}
                    className="w-full py-5 bg-black text-white font-extrabold uppercase tracking-[0.3em] text-[11px] shadow-[6px_6px_0px_0px_rgba(255,105,62,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3"
                  >
                    Submit Final Review
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualDashboard;
