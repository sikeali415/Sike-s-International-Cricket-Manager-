
import React, { useState, useMemo } from 'react';
import { NewsArticle } from '../types';
import { Newspaper, Users, Trophy, Sparkles, Search, Filter, ArrowRight } from 'lucide-react';

interface NewsProps {
    news: NewsArticle[];
}

const News: React.FC<NewsProps> = ({ news }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredNews = useMemo(() => {
        return (news || []).filter(article => {
            const matchesCategory = selectedCategory === 'ALL' || 
                (selectedCategory === 'SQUADS' && (article.type === 'squad' || article.category === 'Tournament & Draft')) ||
                (selectedCategory === 'MATCHES' && (article.type === 'match' || article.type === 'performance')) ||
                (selectedCategory === 'RECORDS' && (article.type === 'milestone' || article.type === 'record' || article.category === 'Record Breaker'));

            const matchesSearch = searchQuery.trim() === '' || 
                article.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (article.content && article.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (article.excerpt && article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesCategory && matchesSearch;
        });
    }, [news, selectedCategory, searchQuery]);

    return (
        <div className="p-3 sm:p-5 max-w-4xl mx-auto min-h-screen space-y-4 text-slate-100">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                        <Newspaper className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black uppercase tracking-wider text-white">International Cricket Press &amp; News</h2>
                        <p className="text-xs text-slate-400">Official match reports, 15-man squad announcements, incomers &amp; omissions</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search headlines, players..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                </div>
            </div>

            {/* Filter Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { id: 'ALL', label: 'All Media' },
                    { id: 'SQUADS', label: 'Squad & Selection' },
                    { id: 'MATCHES', label: 'Match Reviews' },
                    { id: 'RECORDS', label: 'Milestones & Records' },
                ].map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            selectedCategory === cat.id
                                ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* News Articles List */}
            <div className="space-y-3">
                {filteredNews.map(article => {
                    const isSquad = article.type === 'squad' || article.headline.includes('15-MAN SQUAD') || article.headline.includes('SQUAD:');

                    return (
                        <div 
                            key={article.id} 
                            className={`p-4 rounded-2xl border transition-all ${
                                isSquad
                                    ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-500/50 shadow-md'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                                        isSquad
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            : article.type === 'record' || article.type === 'milestone'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                    }`}>
                                        {isSquad ? '📋 SQUAD SELECTION' : (article.category || 'PRESS BULLETIN')}
                                    </span>
                                    {article.relatedTeamName && (
                                        <span className="text-[11px] font-bold text-slate-300">
                                            {article.relatedTeamName}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    {article.date}
                                </span>
                            </div>

                            <h3 className="font-extrabold text-sm sm:text-base text-white leading-snug mb-1.5">
                                {article.headline}
                            </h3>

                            {article.excerpt && (
                                <p className="text-xs text-slate-300 mb-2 leading-relaxed font-medium">
                                    {article.excerpt}
                                </p>
                            )}

                            {article.content && article.content !== article.excerpt && (
                                <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                                    {article.content}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredNews.length === 0 && (
                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-2">
                        <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-bold text-slate-400">No news articles found for this filter.</p>
                        <p className="text-xs text-slate-500">Play matches or select 15-man squad to see new press bulletins.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default News;
