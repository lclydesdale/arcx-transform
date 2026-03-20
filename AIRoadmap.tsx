
import React, { useRef, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AirtableRecord, AirtableFields } from '../types';
import { Download, Loader2, Sparkles, AlertCircle, LogOut, ArrowRight, CheckCircle2, PieChart as PieChartIcon, Calendar, Zap } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { updateAirtableRecord } from '../services/airtableService';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AIRoadmapProps {
  records: AirtableRecord[];
  onRecordUpdate?: (id: string, fields: Partial<AirtableFields>) => void;
}

interface RoadmapData {
  workBreakdown: {
    category: string;
    percentage: number;
    activities: string;
  }[];
  phases: {
    phase: string;
    title: string;
    focus: string;
    steps: string[];
  }[];
}

const COLORS = ['#FF693E', '#A9ECF7', '#FFFAB4', '#DFFFBE', '#0095F0', '#005650'];

const AIRoadmap: React.FC<AIRoadmapProps> = ({ records, onRecordUpdate }) => {
  const { id } = useParams<{ id: string }>();
  const record = records.find(r => r.id === id);
  const navigate = useNavigate();
  const roadmapRef = useRef<HTMLDivElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;

    const generateRoadmap = async () => {
      try {
        setIsGenerating(true);
        setError(null);

        // Check cache
        if (record.fields.AI_AugmentationPlan) {
          try {
            const cached = JSON.parse(record.fields.AI_AugmentationPlan);
            if (cached.workBreakdown && cached.phases) {
              setRoadmapData(cached);
              setIsGenerating(false);
              return;
            }
          } catch (e) {
            console.warn("Invalid AI_AugmentationPlan, regenerating...");
          }
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        
        const prompt = `
          You are an AI Strategy Consultant. Based on the following Role Audit and Feedback data, create a personalized 3-month AI Integration Roadmap.
          
          ROLE AUDIT DATA:
          ${record.fields.Refined_JSON || JSON.stringify(record.fields)}
          
          USER FEEDBACK:
          - Missing Work: ${record.fields.Feedback_MissingWork || 'N/A'}
          - Additional Tools: ${record.fields.Feedback_AdditionalTools || 'N/A'}
          - Enjoyable Work: ${record.fields.Feedback_EnjoyableWork || 'N/A'}
          - Backlog Blockers: ${record.fields.Feedback_BacklogBlockers || 'N/A'}
          - Personal Judgment Areas: ${record.fields.Feedback_PersonalJudgment || 'N/A'}
          - Tools to Replace: ${record.fields.Feedback_ToolReplacement || 'N/A'}
          - Tech Workarounds: ${record.fields.Feedback_TechWorkarounds || 'N/A'}
          - Inevitable Chores: ${record.fields.Feedback_InevitableChores || 'N/A'}
          - Next AI Win Goal: ${record.fields.Feedback_NextAIWin || 'N/A'}
          - Main AI Focus: ${record.fields.Feedback_MainAIFocus || 'N/A'}
          
          TASK:
          1. Create a "Work Breakdown" (5-6 categories) with estimated percentages and primary activities.
          2. Create a 3-Phase AI Integration Plan (Phase 1: Month 1, Phase 2: Month 2, Phase 3: Month 3).
          
          Phase 1 should focus on "Quick Wins" and automating chores.
          Phase 2 should focus on "Workflow Augmentation" and strategic backlog.
          Phase 3 should focus on "AI-Native Transformation" and high-value creative/analytical tasks.
          
          Return the data in the specified JSON format.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                workBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      percentage: { type: Type.NUMBER },
                      activities: { type: Type.STRING }
                    },
                    required: ["category", "percentage", "activities"]
                  }
                },
                phases: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phase: { type: Type.STRING },
                      title: { type: Type.STRING },
                      focus: { type: Type.STRING },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["phase", "title", "focus", "steps"]
                  }
                }
              },
              required: ["workBreakdown", "phases"]
            }
          }
        });

        const result = JSON.parse(response.text || "{}");
        setRoadmapData(result);

        // Cache result
        await updateAirtableRecord(record.id, { "AI_AugmentationPlan": JSON.stringify(result) });
        if (onRecordUpdate) {
          onRecordUpdate(record.id, { "AI_AugmentationPlan": JSON.stringify(result) });
        }

      } catch (err: any) {
        console.error("Roadmap generation failed:", err);
        setError("Failed to generate your personalized roadmap. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };

    generateRoadmap();
  }, [record?.id]);

  const handleDownloadPDF = async () => {
    if (!roadmapRef.current) return;
    try {
      setIsDownloading(true);
      const element = roadmapRef.current;
      const safeName = (record?.fields.Name || 'Participant').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const opt = {
        margin: 0,
        filename: `${safeName}_ai_roadmap.pdf`,
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

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-serif mb-4">Record Not Found</h2>
        <Link to="/" className="text-brand-accent uppercase font-bold tracking-widest text-xs hover:underline">Return to Access Portal</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-20">
      <div className="max-w-[100vw] mx-auto p-4 flex items-center justify-between no-print border-b border-black/5 bg-white sticky top-0 z-50">
        <div className="flex gap-4">
          <button 
            onClick={() => navigate(`/dashboard/${record.id}`)} 
            className="flex items-center gap-2 text-brand-dark hover:text-black font-bold uppercase tracking-widest text-[10px]"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Audit
          </button>
          <Link to="/" className="flex items-center gap-2 text-black/40 hover:text-brand-accent font-bold uppercase tracking-widest text-[10px] ml-4">
            <LogOut className="w-3 h-3" /> Sign Out
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isGenerating && <span className="text-[10px] font-extrabold text-brand-active animate-pulse uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Architecting Roadmap...
          </span>}
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading || isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-black text-black font-bold uppercase tracking-widest text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download Roadmap
          </button>
        </div>
      </div>

      <div className="flex justify-center pt-6 md:pt-12 px-0 md:px-4">
        <div 
          ref={roadmapRef}
          className="dashboard-container p-6 md:p-10 flex flex-col gap-6"
        >
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-brand-active animate-spin" />
              <p className="text-xs font-extrabold uppercase tracking-widest text-black/40">Analyzing Audit & Feedback...</p>
            </div>
          ) : (
            <>
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-[3px] border-black pb-4 gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif text-black leading-none mb-2 tracking-tighter">
                    AI Integration Roadmap
                  </h1>
                  <p className="text-[10px] font-extrabold text-brand-accent uppercase tracking-[0.3em] leading-none">
                    Personalized Strategy for {record.fields.Name}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="w-16 h-2 bg-black mb-2 md:ml-auto"></div>
                  <p className="text-[8px] font-extrabold text-black/40 uppercase tracking-widest">3-Month Implementation Plan</p>
                </div>
              </header>

              <div className="grid grid-cols-1 gap-6 overflow-hidden flex-grow">
                {/* Work Breakdown Section */}
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-black flex items-center justify-center">
                      <PieChartIcon className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-serif uppercase tracking-tight">Current Work Breakdown</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 items-center bg-brand-cream/30 border border-black/5 p-4">
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roadmapData?.workBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="percentage"
                            nameKey="category"
                            isAnimationActive={false}
                          >
                            {roadmapData?.workBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="black" strokeWidth={1} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', border: '1px solid black', borderRadius: '0', fontSize: '10px', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-black/20">
                            <th className="text-[9px] font-extrabold uppercase tracking-widest py-1.5">Category</th>
                            <th className="text-[9px] font-extrabold uppercase tracking-widest py-1.5 text-right">%</th>
                            <th className="text-[9px] font-extrabold uppercase tracking-widest py-1.5 pl-4">Primary Activities</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roadmapData?.workBreakdown.map((item, idx) => (
                            <tr key={idx} className="border-b border-black/5">
                              <td className="py-1.5 flex items-center gap-2">
                                <div className="w-2 h-2" style={{ backgroundColor: COLORS[idx % COLORS.length], border: '1px solid black' }}></div>
                                <span className="text-[10px] font-bold">{item.category}</span>
                              </td>
                              <td className="py-1.5 text-[10px] font-mono text-right">{item.percentage}%</td>
                              <td className="py-1.5 pl-4 text-[9px] text-black/60 leading-tight">{item.activities}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                {/* 3-Phase Roadmap Section */}
                <section className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-brand-accent flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-serif uppercase tracking-tight">3-Month Implementation Strategy</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
                    {roadmapData?.phases.map((phase, idx) => (
                      <div key={idx} className={`border-2 border-black p-4 relative flex flex-col ${idx === 0 ? 'bg-brand-blue/10' : idx === 1 ? 'bg-brand-yellow/10' : 'bg-brand-green/10'}`}>
                        <div className="absolute -top-3 -left-3 bg-black text-white text-[9px] font-extrabold px-3 py-1 uppercase tracking-widest">
                          {phase.phase}
                        </div>
                        <div className="mb-3 pt-1">
                          <h3 className="text-lg font-serif mb-0.5 leading-tight">{phase.title}</h3>
                          <p className="text-[8px] font-extrabold uppercase tracking-widest text-brand-accent">{phase.focus}</p>
                        </div>
                        <ul className="space-y-2.5">
                          {phase.steps.map((step, sIdx) => (
                            <li key={sIdx} className="flex gap-2 items-start">
                              <Zap className="w-3 h-3 text-brand-accent shrink-0 mt-0.5" />
                              <span className="text-[9.5px] leading-snug font-medium">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <footer className="mt-auto pt-8 border-t border-black/10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-black/30">ARCx Role Strategy | Confidential</p>
                  <p className="text-[7px] font-bold text-black/20 italic">Powered by Gemini</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <p className="text-[7px] font-extrabold uppercase text-black/20 tracking-widest">Strategy Status</p>
                    <p className="text-[10px] font-bold uppercase text-brand-active">Ready for Deployment</p>
                  </div>
                  <div className="w-10 h-10 border border-black flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-black" />
                  </div>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRoadmap;
