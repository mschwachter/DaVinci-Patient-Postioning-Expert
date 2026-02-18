
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { 
  Loader2, Activity, ShieldCheck, 
  Settings, Scissors, Thermometer, 
  Dna, Microscope, HeartPulse, Brain, Eye
} from 'lucide-react';

interface LoadingProps {
  status: string;
  step: number;
  facts?: string[];
}

const Loading: React.FC<LoadingProps> = ({ status, step, facts = [] }) => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  
  useEffect(() => {
    if (facts.length > 0) {
      const interval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % facts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [facts]);

  const MedicalItem = ({ delay, position, icon: Icon }: { delay: number, position: number, icon: any }) => {
    const isEven = position % 2 === 0;
    return (
      <div 
        className="absolute text-emerald-500/30 dark:text-emerald-500/20"
        style={{
          animation: `float 4s infinite ease-in-out ${delay}s`,
          top: `${(position * 15) % 85}%`,
          left: isEven ? '5%' : '90%',
        }}
      >
        <Icon className="w-8 h-8 md:w-12 md:h-12" />
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-[500px] bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.5; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes scan {
          0%, 100% { top: 0% }
          50% { top: 100% }
        }
      `}</style>

      <div className="absolute inset-0">
        <MedicalItem position={1} delay={0} icon={HeartPulse} />
        <MedicalItem position={2} delay={1} icon={Activity} />
        <MedicalItem position={3} delay={0.5} icon={ShieldCheck} />
        <MedicalItem position={4} delay={1.5} icon={Brain} />
        <MedicalItem position={5} delay={2} icon={Microscope} />
        <MedicalItem position={6} delay={0.8} icon={Eye} />
      </div>

      <div className="relative z-10 text-center space-y-8 max-w-xl px-8">
        <div className="relative mx-auto w-36 h-36 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-[pulse-ring_2s_infinite]"></div>
          <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-full animate-ping"></div>
          
          <div className="bg-emerald-600 p-6 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.5)] relative overflow-hidden">
            {status.toLowerCase().includes('vision') && (
              <div className="absolute inset-0 bg-emerald-400/20 animate-[scan_2s_ease-in-out_infinite] h-1 w-full z-10"></div>
            )}
            <Loader2 className="w-14 h-14 text-white animate-spin" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-emerald-500 font-bold uppercase tracking-[0.3em] text-[10px]">{status}</h3>
            <div className="h-2 w-full max-w-[200px] mx-auto bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="h-40 flex items-center justify-center">
            {facts.length > 0 ? (
              <p key={currentFactIndex} className="text-lg md:text-xl font-medium text-slate-300 italic animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-md">
                "{facts[currentFactIndex]}"
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-50">
                <Brain className="w-8 h-8 animate-pulse" />
                <p className="text-sm italic font-display">Computing biomechanical constraints...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
