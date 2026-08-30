
import React from 'react';
import { TEAMS, GROUNDS } from '../data';
import { Globe, MapPin, Users, Shield } from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface TeamSelectionProps {
    onTeamSelected: (teamId: string) => void;
    theme: 'light' | 'dark';
}

const TeamSelection: React.FC<TeamSelectionProps> = ({ onTeamSelected }) => {
    // 12 Full members + 4 Associates
    const fullMembers = TEAMS.slice(0, 12);
    const associateMembers = TEAMS.slice(12);

    const getGroundDetails = (code: string) => {
        return GROUNDS.find(g => g.code === code);
    };

    const handleSelect = (teamId: string) => {
        playSFX('click');
        onTeamSelected(teamId);
    };

    return (
        <div className="p-6 h-full overflow-y-auto max-w-6xl mx-auto space-y-8 pb-16">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-widest">
                    <Globe size={14} />
                    <span>International Cricket Championship</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Select Your National Team</h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                    Take command of an international cricket powerhouse across T10, T20, ODI, and Test championships.
                </p>
            </div>
            
            {/* Full Member Nations */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Shield size={18} className="text-emerald-400" />
                    <h3 className="text-lg font-black tracking-wide uppercase text-slate-200">Full Member Nations</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {fullMembers.map(team => {
                        const ground = getGroundDetails(team.homeGround);
                        return (
                            <div 
                                key={team.id}
                                onClick={() => handleSelect(team.id)}
                                className="group relative bg-slate-900/80 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col items-center text-center space-y-3"
                            >
                                <div 
                                    className="w-16 h-16 transition-transform group-hover:scale-110 drop-shadow-md" 
                                    dangerouslySetInnerHTML={{ __html: team.logo }}
                                />
                                <div>
                                    <h4 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">{team.name}</h4>
                                    {ground && (
                                        <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1 truncate">
                                            <MapPin size={11} className="text-slate-500 shrink-0" />
                                            <span className="truncate">{ground.name.split(',')[0]}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Associate Member Nations */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Users size={18} className="text-sky-400" />
                    <h3 className="text-lg font-black tracking-wide uppercase text-slate-200">Associate Member Nations</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {associateMembers.map(team => {
                        const ground = getGroundDetails(team.homeGround);
                        return (
                            <div 
                                key={team.id}
                                onClick={() => handleSelect(team.id)}
                                className="group relative bg-slate-900/80 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all duration-200 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 flex flex-col items-center text-center space-y-3"
                            >
                                <div 
                                    className="w-16 h-16 transition-transform group-hover:scale-110 drop-shadow-md" 
                                    dangerouslySetInnerHTML={{ __html: team.logo }}
                                />
                                <div>
                                    <h4 className="text-base font-black text-white group-hover:text-sky-400 transition-colors">{team.name}</h4>
                                    {ground && (
                                        <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1 truncate">
                                            <MapPin size={11} className="text-slate-500 shrink-0" />
                                            <span className="truncate">{ground.name.split(',')[0]}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeamSelection;
