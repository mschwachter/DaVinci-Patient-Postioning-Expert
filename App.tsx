
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, ClinicalRole, PlanType, Language, SearchResultItem, GuideStep } from './types';
import { researchTopicForPrompt, generateInfographicImage, editInfographicImage } from './services/geminiService';
import Infographic from './components/Infographic';
import Loading from './components/Loading';
import IntroScreen from './components/IntroScreen';
import SearchResults from './components/SearchResults';
import { 
  Activity, AlertCircle, CheckCircle2, FileText, 
  Moon, Sun, Info, Settings, Scissors, ShieldCheck,
  Thermometer, Upload, Camera, Trash2, HelpCircle,
  ListOrdered, ChevronRight, MessageSquare, Cpu,
  Box, X
} from 'lucide-react';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [topic, setTopic] = useState('Severe spinal deformity, 60° hip contracture, Robotic Colopexy');
  const [role, setRole] = useState<ClinicalRole>('General Surgeon');
  const [planType, setPlanType] = useState<PlanType>('Positioning Diagram');
  const [language, setLanguage] = useState<Language>('English');
  const [patientPhotos, setPatientPhotos] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [loadingFacts, setLoadingFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResultItem[]>([]);
  const [currentCheckpoints, setCurrentCheckpoints] = useState<string[]>([]);
  const [multiStepGuide, setMultiStepGuide] = useState<GuideStep[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [caseSummary, setCaseSummary] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio?.hasSelectedApiKey) {
          setHasApiKey(await window.aistudio.hasSelectedApiKey());
        } else {
          setHasApiKey(true);
        }
      } catch (e) {
        setHasApiKey(true);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume the key selection was successful to proceed to the app.
      setHasApiKey(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Use explicit File typing to avoid 'unknown' assignability issues with FileReader.readAsDataURL.
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPatientPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPatientPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingStep(1);
    setLoadingMessage(patientPhotos.length > 0 ? `Clinical Vision: Analyzing ${patientPhotos.length} Patient Photos...` : "Benchmarking Robotic Positioning Data...");

    try {
      const research = await researchTopicForPrompt(topic, role, planType, language, patientPhotos.length > 0 ? patientPhotos : undefined);
      setLoadingFacts(research.checkpoints);
      setCurrentSearchResults(research.searchResults);
      setCurrentCheckpoints(research.checkpoints);
      setMultiStepGuide(research.multiStepGuide);
      setFollowUpQuestions(research.followUpQuestions);
      setCaseSummary(research.summary);
      
      setLoadingStep(2);
      setLoadingMessage("Simulating Da Vinci Xi Arm Clearance & Vectors...");
      
      const base64Data = await generateInfographicImage(research.imagePrompt);
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        data: base64Data,
        prompt: topic,
        timestamp: Date.now(),
        role: role,
        type: planType,
        language: language
      };

      setImageHistory([newImage, ...imageHistory]);
    } catch (err: any) {
      console.error(err);
      setError(err.message?.includes("403") ? "Key Authorization Failed. Please select a valid billing-enabled key." : "Simulation error. Please check anatomical details and retry.");
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleEdit = async (editPrompt: string) => {
    if (imageHistory.length === 0) return;
    setIsLoading(true);
    setLoadingMessage("Refining Robotic Visuals...");
    try {
      const base64Data = await editInfographicImage(imageHistory[0].data, editPrompt);
      setImageHistory([{ ...imageHistory[0], id: Date.now().toString(), data: base64Data, prompt: editPrompt }, ...imageHistory]);
    } catch (err) {
      setError("Modification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (q: string) => {
    setTopic(prev => `${prev}\n\n[Clinical Query Result]: ${q}`);
  };

  return (
    <>
    {!checkingKey && !hasApiKey && (
      <div className="fixed inset-0 z-[200] bg-slate-950/95 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <Thermometer className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-display font-bold">Clinical Key Required</h2>
          <p className="text-slate-500 text-sm">Select a paid-tier API key to access high-precision surgical simulation models. Visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">ai.google.dev/gemini-api/docs/billing</a> for more info.</p>
          <button onClick={handleSelectKey} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Configure Access</button>
        </div>
      </div>
    )}

    {showIntro ? <IntroScreen onComplete={() => setShowIntro(false)} /> : (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 transition-colors">
        <header className="border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-500/20"><Cpu className="text-white w-6 h-6" /></div>
              <div>
                <h1 className="text-xl font-display font-bold">SurgiPlan <span className="text-emerald-500">Pro</span></h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Da Vinci Clinical Specialist Edition</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-white/5 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className={imageHistory.length > 0 || isLoading ? "grid grid-cols-1 lg:grid-cols-12 gap-8" : "max-w-3xl mx-auto pt-20"}>
            
            {/* Input Panel */}
            <div className={`${imageHistory.length > 0 || isLoading ? 'lg:col-span-4' : 'w-full'} space-y-6`}>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Box className="w-12 h-12" />
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-xs tracking-widest">
                    <Activity className="w-4 h-4" /> <span>Clinical Input</span>
                  </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative group/photo">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                        multiple
                      />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-slate-500 shadow-sm"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase tracking-tighter">Add Deformity Photos</span>
                        <span className="text-[10px] opacity-60">Upload multiple angles for vision analysis</span>
                      </button>
                    </div>

                    {patientPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {patientPhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group/thumb">
                            <img src={photo} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Anatomical & Procedural Context</label>
                    <textarea 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Specify Da Vinci system, procedure, and deformity degree..."
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] shadow-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Role Specialty</label>
                      <select value={role} onChange={(e) => setRole(e.target.value as ClinicalRole)} className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-xs shadow-sm">
                        <option>General Surgeon</option>
                        <option>Anesthesiology</option>
                        <option>Robotic Tech</option>
                        <option>Perioperative Nurse</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Visual Scope</label>
                      <select value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)} className="w-full mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-xs shadow-sm">
                        <option>Positioning Diagram</option>
                        <option>Robotic Port Map</option>
                        <option>Room Layout</option>
                        <option>Pressure Point Map</option>
                        <option>Anatomical Schematic</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    disabled={isLoading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                  >
                    {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span> : <Cpu className="w-4 h-4" />}
                    <span>{patientPhotos.length > 0 ? 'EXECUTE MULTI-PHOTO SIMULATION' : 'GENERATE CLINICAL PROTOCOL'}</span>
                  </button>
                </form>
              </div>

              {imageHistory.length > 0 && followUpQuestions.length > 0 && (
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-emerald-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <HelpCircle className="w-4 h-4" /> Strategic Refinement
                  </h3>
                  <div className="space-y-2">
                    {followUpQuestions.map((q, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => handleQuestionClick(q)}
                        className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-xs text-slate-400 flex items-start gap-2 group"
                      >
                        <MessageSquare className="w-3 h-3 mt-0.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results Panel */}
            {(imageHistory.length > 0 || isLoading) && (
              <div className="lg:col-span-8 space-y-8">
                {isLoading ? (
                  <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />
                ) : (
                  imageHistory.length > 0 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                      {/* High-Fidelity Visualization Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                        <div className="flex items-center gap-2 mb-6 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                          <FileText className="w-4 h-4" /> <span>Clinical Architecture Visualization</span>
                        </div>
                        <Infographic image={imageHistory[0]} onEdit={handleEdit} isEditing={isLoading} />
                        
                        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl">
                          <h4 className="text-xs font-bold text-emerald-500 mb-3 uppercase flex items-center gap-2 tracking-widest">
                            <Info className="w-3 h-3" /> Expert Analysis & Constraints
                          </h4>
                          <p className="text-sm leading-relaxed text-slate-400 whitespace-pre-line">{caseSummary}</p>
                        </div>
                      </div>

                      {/* Phased Protocol Guide */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-8 text-emerald-500 text-[10px] uppercase font-bold tracking-widest">
                          <ListOrdered className="w-4 h-4" /> <span>Multi-Phase Surgical Protocol</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          {multiStepGuide.map((step, idx) => (
                            <div key={idx} className="relative pl-12 group">
                              <div className="absolute left-0 top-0 w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/30 flex items-center justify-center text-emerald-500 font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                {idx + 1}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 text-sm group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{step.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Checklist & Grounding */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-8 h-fit shadow-lg shadow-emerald-500/5">
                          <h3 className="text-sm font-bold text-emerald-500 mb-6 flex items-center gap-2 uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" /> PERIOPERATIVE CHECKPOINTS
                          </h3>
                          <div className="space-y-4">
                            {currentCheckpoints.map((cp, idx) => (
                              <div key={idx} className="flex gap-4 text-xs group">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <span className="text-slate-300 font-medium leading-relaxed">{cp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <SearchResults results={currentSearchResults} />
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-8 py-5 rounded-3xl border border-red-500 flex items-center gap-4 shadow-[0_0_50px_rgba(239,68,68,0.3)] z-[100] animate-in fade-in slide-in-from-bottom-5">
              <AlertCircle className="w-6 h-6 text-red-200" />
              <span className="text-sm font-bold tracking-tight">{error}</span>
            </div>
          )}
        </main>
      </div>
    )}
    </>
  );
};

export default App;
