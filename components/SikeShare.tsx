import React, { useState, useMemo } from 'react';
import { 
    GameData, SikePost, SikeShareState, SocialMetrics, PressQuestion, 
    PressOption, Player, Team, ViralMoment 
} from '../types';
import { 
    formatFollowerCount, initSikeShareData, generatePlayerHandle, generateTeamHandle 
} from '../utils/sikeShareUtils';
import { 
    MessageSquare, Heart, Repeat, Share2, CheckCircle2, TrendingUp, 
    Award, Flame, Trophy, Search, UserPlus, UserCheck, BarChart2, 
    Send, Sparkles, AlertCircle, HelpCircle, Radio, Users, Shield, 
    RadioTower, ArrowLeft, Eye
} from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface SikeShareProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
    onViewPlayerProfile?: (player: Player) => void;
}

export const SikeShare: React.FC<SikeShareProps> = ({
    gameData,
    setGameData,
    showFeedback,
    onViewPlayerProfile
}) => {
    const [activeTab, setActiveTab] = useState<'FEED' | 'TRENDING' | 'LEADERBOARD' | 'PRESS' | 'HALL_OF_FAME'>('FEED');
    const [selectedHashtagFilter, setSelectedHashtagFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSocialProfile, setSelectedSocialProfile] = useState<{
        type: 'player' | 'team';
        id: string;
        name: string;
        handle: string;
        metrics: SocialMetrics;
        bio?: string;
        avatarColor?: string;
        playerObj?: Player;
        teamObj?: Team;
    } | null>(null);

    const [newPostContent, setNewPostContent] = useState('');
    const [showComposeModal, setShowComposeModal] = useState(false);

    // Initialize or retrieve state
    const sikeState: SikeShareState = useMemo(() => {
        if (gameData.sikeShareData && gameData.sikeShareData.posts && gameData.sikeShareData.posts.length > 0) {
            return gameData.sikeShareData;
        }
        return initSikeShareData(gameData);
    }, [gameData.sikeShareData, gameData]);

    // Handle like toggle
    const handleLike = (postId: string) => {
        playSFX('click');
        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            const updatedPosts = current.posts.map(p => {
                if (p.id === postId) {
                    const liked = !p.userLiked;
                    return {
                        ...p,
                        userLiked: liked,
                        likes: liked ? p.likes + 1 : p.likes - 1
                    };
                }
                return p;
            });
            return {
                ...prev,
                sikeShareData: { ...current, posts: updatedPosts }
            };
        });
    };

    // Handle repost toggle
    const handleRepost = (postId: string) => {
        playSFX('click');
        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            const updatedPosts = current.posts.map(p => {
                if (p.id === postId) {
                    const reposted = !p.userReposted;
                    return {
                        ...p,
                        userReposted: reposted,
                        reposts: reposted ? p.reposts + 1 : p.reposts - 1
                    };
                }
                return p;
            });
            return {
                ...prev,
                sikeShareData: { ...current, posts: updatedPosts }
            };
        });
        showFeedback('Reposted to your Sike Share profile!', 'success');
    };

    // Handle Poll Voting
    const handleVotePoll = (postId: string, optionId: number) => {
        playSFX('click');
        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            const updatedPosts = current.posts.map(p => {
                if (p.id === postId && p.poll && p.poll.userVotedOption === undefined) {
                    const newOptions = p.poll.options.map(opt => {
                        if (opt.id === optionId) {
                            return { ...opt, votes: opt.votes + 1 };
                        }
                        return opt;
                    });
                    return {
                        ...p,
                        poll: {
                            ...p.poll,
                            options: newOptions,
                            totalVotes: p.poll.totalVotes + 1,
                            userVotedOption: optionId
                        }
                    };
                }
                return p;
            });
            return {
                ...prev,
                sikeShareData: { ...current, posts: updatedPosts }
            };
        });
        showFeedback('Vote recorded on Sike Share Poll!', 'success');
    };

    // Handle Press Conference Response
    const handleAnswerPressQuestion = (postId: string, option: PressOption) => {
        playSFX('success');
        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            
            // Adjust manager popularity
            const updatedPopularity = Math.min(100, Math.max(10, (prev.popularity || 50) + option.fanImpact));

            // Generate reaction post from fans based on answer type
            let fanReplyContent = '';
            if (option.type === 'respectful' || option.type === 'calm') {
                fanReplyContent = `👏 Classy response from the manager! That level of focus is exactly what we need for the next fixture. #ManagerClass #SikeShare`;
            } else if (option.type === 'aggressive') {
                fanReplyContent = `🔥 BOOM! Love the manager's fiery attitude in the press conference today! No holding back! #FieryManager`;
            } else {
                fanReplyContent = `🤔 Hmm, the manager gave nothing away in today's presser. Fans want answers! #CricketDebate`;
            }

            const newReactionPost: SikePost = {
                id: `post-reply-${Date.now()}`,
                authorName: 'Sike Share Fan Pulse',
                authorHandle: '@fanpulse_live',
                authorRole: 'fan',
                isVerified: false,
                content: fanReplyContent,
                timestamp: 'Just now',
                likes: Math.floor(Math.random() * 3000) + 500,
                reposts: Math.floor(Math.random() * 800) + 100,
                replies: Math.floor(Math.random() * 200) + 30
            };

            const updatedPosts = current.posts.map(p => {
                if (p.id === postId && p.pressQuestion) {
                    return {
                        ...p,
                        pressQuestion: {
                            ...p.pressQuestion,
                            answered: true,
                            chosenOption: option.type
                        }
                    };
                }
                return p;
            });

            return {
                ...prev,
                popularity: updatedPopularity,
                sikeShareData: {
                    ...current,
                    posts: [newReactionPost, ...updatedPosts]
                }
            };
        });

        showFeedback(`Press statement issued! Fan Support ${option.fanImpact >= 0 ? '+' : ''}${option.fanImpact}%`, option.fanImpact >= 0 ? 'success' : 'error');
    };

    // Follow/Unfollow handler
    const handleToggleFollow = (handle: string) => {
        playSFX('click');
        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            const isFollowing = current.followedHandles?.includes(handle);
            const newFollowed = isFollowing
                ? current.followedHandles.filter(h => h !== handle)
                : [...(current.followedHandles || []), handle];

            return {
                ...prev,
                sikeShareData: {
                    ...current,
                    followedHandles: newFollowed
                }
            };
        });
    };

    // Compose custom manager post
    const handlePostStatement = () => {
        if (!newPostContent.trim()) return;
        playSFX('success');
        
        const userTeam = gameData.teams.find(t => t.id === gameData.userTeamId);
        const managerPost: SikePost = {
            id: `post-manager-${Date.now()}`,
            authorName: `${userTeam?.name || 'Manager'} Official`,
            authorHandle: generateTeamHandle(userTeam?.name || 'manager'),
            authorRole: 'team',
            isVerified: true,
            content: newPostContent.trim(),
            timestamp: 'Just now',
            likes: Math.floor(Math.random() * 5000) + 1200,
            reposts: Math.floor(Math.random() * 1200) + 300,
            replies: Math.floor(Math.random() * 400) + 80,
            viralBadge: 'OFFICIAL STATEMENT'
        };

        setGameData(prev => {
            if (!prev) return null;
            const current = prev.sikeShareData || sikeState;
            return {
                ...prev,
                sikeShareData: {
                    ...current,
                    posts: [managerPost, ...current.posts]
                }
            };
        });

        setNewPostContent('');
        setShowComposeModal(false);
        showFeedback('Official Statement posted on Sike Share!', 'success');
    };

    // Filtered posts logic
    const filteredPosts = useMemo(() => {
        let list = sikeState.posts || [];
        if (selectedHashtagFilter) {
            list = list.filter(p => p.content.includes(selectedHashtagFilter) || p.hashtags?.includes(selectedHashtagFilter));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p => p.authorName.toLowerCase().includes(q) || p.authorHandle.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
        }
        return list;
    }, [sikeState.posts, selectedHashtagFilter, searchQuery]);

    // Top Followed Players List
    const topFollowedPlayers = useMemo(() => {
        let list = [...gameData.allPlayers]
            .map(p => {
                const soc = sikeState.playerSocials[p.id] || {
                    followers: 0,
                    popularity: 0,
                    reputation: 0,
                    fanHappiness: 0,
                    trendingScore: 0,
                    formRating: 0,
                    handle: generatePlayerHandle(p.name),
                    isVerified: false
                };
                return { player: p, metrics: soc };
            })
            .sort((a, b) => b.metrics.followers - a.metrics.followers);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(({ player: p, metrics: m }) =>
                p.name.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q) ||
                m.handle.toLowerCase().includes(q) ||
                p.role.toLowerCase().includes(q) ||
                p.nationality.toLowerCase().includes(q)
            );
        }

        return list;
    }, [gameData.allPlayers, sikeState.playerSocials, searchQuery]);

    const openPlayerSocial = (player: Player) => {
        const soc = sikeState.playerSocials[player.id] || {
            followers: 0,
            popularity: 0,
            reputation: 0,
            fanHappiness: 0,
            trendingScore: 0,
            formRating: 0,
            handle: generatePlayerHandle(player.name),
            isVerified: false,
            bio: `${player.role} | Cricket International`
        };

        setSelectedSocialProfile({
            type: 'player',
            id: player.id,
            name: player.name,
            handle: soc.handle || generatePlayerHandle(player.name),
            metrics: soc,
            bio: soc.bio || `${player.role} | International Star | Cricket Manager 26`,
            avatarColor: 'bg-gradient-to-tr from-cyan-500 to-blue-600',
            playerObj: player
        });
    };

    const openTeamSocial = (team: Team) => {
        const soc = sikeState.teamSocials[team.id] || {
            followers: 0,
            popularity: 0,
            reputation: 0,
            fanHappiness: 0,
            trendingScore: 0,
            formRating: 0,
            handle: generateTeamHandle(team.name),
            isVerified: false,
            bio: `Official Sike Share account of ${team.name}.`
        };

        setSelectedSocialProfile({
            type: 'team',
            id: team.id,
            name: team.name,
            handle: soc.handle || generateTeamHandle(team.name),
            metrics: soc,
            bio: soc.bio || `Official Club Page | ${team.name}`,
            avatarColor: 'bg-gradient-to-tr from-amber-500 to-orange-600',
            teamObj: team
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border border-cyan-500/20 p-6 shadow-2xl">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300">
                            <RadioTower className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-white tracking-wide">SIKE SHARE</h1>
                                <CheckCircle2 size={18} className="text-cyan-400 fill-cyan-400/20" />
                                <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    LIVE SOCIAL NETWORK
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Living Cricket Ecosystem & Fan Pulse • Real-time AI Reactions & Player Metrics
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowComposeModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                    >
                        <Send size={15} />
                        <span>Post Statement</span>
                    </button>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-4 border-t border-slate-800/80 no-scrollbar">
                    <button
                        onClick={() => { setActiveTab('FEED'); setSelectedHashtagFilter(null); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'FEED' && !selectedHashtagFilter
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <MessageSquare size={14} />
                        <span>Home Feed</span>
                    </button>

                    <button
                        onClick={() => { setActiveTab('TRENDING'); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'TRENDING'
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Flame size={14} />
                        <span>Trending & Viral</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('LEADERBOARD')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'LEADERBOARD'
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Users size={14} />
                        <span>Popularity Rankings</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('PRESS')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'PRESS'
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Radio size={14} />
                        <span>Press Room</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('HALL_OF_FAME')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === 'HALL_OF_FAME'
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        <Trophy size={14} />
                        <span>Hall of Fame</span>
                    </button>
                </div>
            </div>

            {/* Active Hashtag Filter Banner */}
            {selectedHashtagFilter && (
                <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs font-bold text-cyan-300">
                    <div className="flex items-center gap-2">
                        <Flame size={16} className="text-cyan-400" />
                        <span>Filtering feed by: <strong className="text-white">{selectedHashtagFilter}</strong></span>
                    </div>
                    <button 
                        onClick={() => setSelectedHashtagFilter(null)}
                        className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-white text-[11px]"
                    >
                        Clear Filter
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players, teams, topics or #hashtags on Sike Share..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
            </div>

            {/* TAB CONTENT: HOME FEED */}
            {activeTab === 'FEED' && (
                <div className="space-y-4">
                    {filteredPosts.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                            <MessageSquare className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No posts found</h3>
                            <p className="text-xs text-slate-500 mt-1">Play matches or post an official statement to start the buzz on Sike Share!</p>
                        </div>
                    ) : (
                        filteredPosts.map(post => {
                            const isFollowingAuthor = sikeState.followedHandles?.includes(post.authorHandle);
                            return (
                                <div 
                                    key={post.id}
                                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                                >
                                    {/* Author Info */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={() => {
                                                    const pl = gameData.allPlayers.find(p => generatePlayerHandle(p.name) === post.authorHandle);
                                                    if (pl) openPlayerSocial(pl);
                                                }}
                                                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm cursor-pointer shadow-md"
                                            >
                                                {post.authorName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span 
                                                        onClick={() => {
                                                            const pl = gameData.allPlayers.find(p => generatePlayerHandle(p.name) === post.authorHandle);
                                                            if (pl) openPlayerSocial(pl);
                                                        }}
                                                        className="font-bold text-xs text-slate-900 dark:text-white hover:underline cursor-pointer"
                                                    >
                                                        {post.authorName}
                                                    </span>
                                                    {post.isVerified && (
                                                        <CheckCircle2 size={13} className="text-cyan-400 fill-cyan-400/20" />
                                                    )}
                                                    <span className="text-[10px] text-slate-400">{post.authorHandle}</span>
                                                    <span className="text-[10px] text-slate-500">• {post.timestamp}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                        {post.authorRole}
                                                    </span>
                                                    {post.viralBadge && (
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                                                            <Flame size={10} />
                                                            {post.viralBadge}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleToggleFollow(post.authorHandle)}
                                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isFollowingAuthor
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                                            }`}
                                            title={isFollowingAuthor ? 'Following' : 'Follow'}
                                        >
                                            {isFollowingAuthor ? <UserCheck size={15} /> : <UserPlus size={15} />}
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                        {post.content}
                                    </p>

                                    {/* Interactive Poll Component */}
                                    {post.poll && (
                                        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <BarChart2 size={14} className="text-cyan-400" />
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">{post.poll.question}</span>
                                            </div>

                                            <div className="space-y-1.5 pt-1">
                                                {post.poll.options.map(opt => {
                                                    const pct = post.poll!.totalVotes > 0 
                                                        ? Math.round((opt.votes / post.poll!.totalVotes) * 100) 
                                                        : 0;
                                                    const isUserChoice = post.poll!.userVotedOption === opt.id;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            disabled={post.poll!.userVotedOption !== undefined}
                                                            onClick={() => handleVotePoll(post.id, opt.id)}
                                                            className={`w-full text-left relative overflow-hidden p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                                                isUserChoice 
                                                                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            {/* Percentage Bar background */}
                                                            {post.poll!.userVotedOption !== undefined && (
                                                                <div 
                                                                    className="absolute left-0 top-0 bottom-0 bg-cyan-500/15 transition-all duration-500"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            )}
                                                            <div className="relative z-10 flex items-center justify-between">
                                                                <span>{opt.text}</span>
                                                                {post.poll!.userVotedOption !== undefined && (
                                                                    <span className="font-bold">{pct}%</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-slate-400 pt-1">{post.poll.totalVotes.toLocaleString()} votes</p>
                                        </div>
                                    )}

                                    {/* Interactive Press Conference Question */}
                                    {post.pressQuestion && !post.pressQuestion.answered && (
                                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 mt-2">
                                            <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-wider">
                                                <Radio size={14} className="animate-pulse" />
                                                <span>Manager Press Response Required</span>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                    Choose your official response to journalist {post.pressQuestion.journalistName}:
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                    {post.pressQuestion.options.map((opt, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleAnswerPressQuestion(post.id, opt)}
                                                            className="p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500 rounded-xl text-left transition-all active:scale-95 space-y-1 group"
                                                        >
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-500">
                                                                <span>{opt.label}</span>
                                                                <span>Morale {opt.moraleImpact >= 0 ? '+' : ''}{opt.moraleImpact}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-snug">
                                                                {opt.text}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Action Buttons */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 text-xs font-semibold">
                                        <button 
                                            onClick={() => handleLike(post.id)}
                                            className={`flex items-center gap-1.5 hover:text-rose-500 transition-all ${
                                                post.userLiked ? 'text-rose-500 font-black' : ''
                                            }`}
                                        >
                                            <Heart size={14} className={post.userLiked ? 'fill-rose-500' : ''} />
                                            <span>{post.likes}</span>
                                        </button>

                                        <button 
                                            onClick={() => handleRepost(post.id)}
                                            className={`flex items-center gap-1.5 hover:text-teal-400 transition-all ${
                                                post.userReposted ? 'text-teal-400 font-black' : ''
                                            }`}
                                        >
                                            <Repeat size={14} />
                                            <span>{post.reposts}</span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            <MessageSquare size={14} />
                                            <span>{post.replies}</span>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                navigator.clipboard?.writeText?.(post.content);
                                                showFeedback('Copied post link to clipboard!', 'success');
                                            }}
                                            className="hover:text-cyan-400 transition-all"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TAB CONTENT: TRENDING & VIRAL */}
            {activeTab === 'TRENDING' && (
                <div className="space-y-6">
                    {/* Trending Hashtags Grid */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider">
                            <Flame size={16} />
                            <span>Worldwide Trending Cricket Topics</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sikeState.trendingHashtags.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setSelectedHashtagFilter(item.tag);
                                        setActiveTab('FEED');
                                    }}
                                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500 rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-extrabold">{item.category}</p>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">{item.tag}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{item.postCount}</p>
                                    </div>
                                    <TrendingUp size={18} className="text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Viral Moments Feed */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Recent Viral Match Moments</h3>
                        {(sikeState.viralMoments || []).length === 0 ? (
                            <div className="text-center py-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                                No viral moments yet this season. Play thrilling matches to ignite Sike Share trends!
                            </div>
                        ) : (
                            (sikeState.viralMoments || []).map(vm => (
                                <div 
                                    key={vm.id}
                                    className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-black">
                                            <Flame size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white">{vm.title}</h4>
                                            <p className="text-xs text-slate-300 mt-0.5">{vm.matchDescription}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{vm.timestamp}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-xs font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg inline-block">
                                            +{formatFollowerCount(vm.followersChange)} Followers
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: POPULARITY RANKINGS */}
            {activeTab === 'LEADERBOARD' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider">
                                <Users size={16} />
                                <span>Most Followed Players in League</span>
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Updated Live</span>
                        </div>

                        <div className="space-y-2">
                            {topFollowedPlayers.slice(0, 50).map((item, idx) => {
                                const p = item.player;
                                const m = item.metrics;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => openPlayerSocial(p)}
                                        className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-400 w-5">#{idx + 1}</span>
                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-xs">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">
                                                        {p.name}
                                                    </h4>
                                                    {m.isVerified && <CheckCircle2 size={12} className="text-cyan-400" />}
                                                    <span className="text-[9px] font-extrabold bg-slate-200 dark:bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                                        ID: {p.id}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400">{m.handle} • {p.role} • {p.nationality}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-900 dark:text-white">
                                                👥 {formatFollowerCount(m.followers)}
                                            </p>
                                            <p className="text-[10px] text-cyan-400 font-semibold">
                                                Popularity {m.popularity}%
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PRESS ROOM */}
            {activeTab === 'PRESS' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-wider">
                            <Radio size={16} />
                            <span>Manager Press Room & Journalist Hub</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Answer post-match media questions from leading sports journalists. Your statements directly sway team morale, fan happiness, and board approval!
                        </p>
                    </div>

                    {filteredPosts.filter(p => p.pressQuestion).length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                            <Radio className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No active press conference questions</h3>
                            <p className="text-xs text-slate-500 mt-1">Play or simulate your next match to trigger live journalist press questions!</p>
                        </div>
                    ) : (
                        filteredPosts.filter(p => p.pressQuestion).map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-xs text-white">{p.pressQuestion?.journalistName}</span>
                                    <span className="text-[10px] text-slate-400">({p.pressQuestion?.journalistOutlet})</span>
                                </div>
                                <p className="text-xs text-slate-300 font-medium italic">"{p.pressQuestion?.question}"</p>
                                {p.pressQuestion?.answered && (
                                    <div className="mt-3 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300">
                                        ✓ Answered with <strong>{p.pressQuestion.chosenOption?.toUpperCase()}</strong> response statement.
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB CONTENT: HALL OF FAME */}
            {activeTab === 'HALL_OF_FAME' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-yellow-500/20 border border-amber-500/40 rounded-3xl p-6 space-y-4 text-center">
                        <Trophy size={36} className="text-amber-400 mx-auto" />
                        <h2 className="text-xl font-black text-white">SIKE SHARE HALL OF FAME</h2>
                        <p className="text-xs text-slate-300 max-w-lg mx-auto">
                            Tracking long-term social impact, viral milestones, and total fan engagement across your managerial career in Cricket Manager 26.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                            <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/20">
                                <p className="text-[10px] text-slate-400 uppercase font-black">Squad Followers</p>
                                <p className="text-lg font-black text-amber-400 mt-0.5">
                                    {formatFollowerCount(topFollowedPlayers.reduce((acc, curr) => acc + curr.metrics.followers, 0))}
                                </p>
                            </div>

                            <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/20">
                                <p className="text-[10px] text-slate-400 uppercase font-black">League Titles</p>
                                <p className="text-lg font-black text-amber-400 mt-0.5">
                                    🏆 {gameData.awardsHistory?.length || 0}
                                </p>
                            </div>

                            <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/20">
                                <p className="text-[10px] text-slate-400 uppercase font-black">AI Fan Reactions</p>
                                <p className="text-lg font-black text-amber-400 mt-0.5">
                                    💬 {(sikeState.hallOfFameStats?.aiReactionsCount || 280000).toLocaleString()}
                                </p>
                            </div>

                            <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/20">
                                <p className="text-[10px] text-slate-400 uppercase font-black">Most Trending</p>
                                <p className="text-xs font-black text-amber-400 mt-1 truncate">
                                    🔥 {topFollowedPlayers[0]?.player.name || 'Legend'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAYER / TEAM SOCIAL PROFILE MODAL */}
            {selectedSocialProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="relative h-28 bg-gradient-to-r from-cyan-900 to-blue-950 border-b border-slate-800 p-4">
                            <button
                                onClick={() => setSelectedSocialProfile(null)}
                                className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all"
                            >
                                ✕
                            </button>
                            <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 border-4 border-slate-900 flex items-center justify-center font-black text-slate-950 text-xl shadow-xl">
                                {selectedSocialProfile.name.charAt(0)}
                            </div>
                        </div>

                        <div className="p-6 pt-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-white">{selectedSocialProfile.name}</h3>
                                        <CheckCircle2 size={16} className="text-cyan-400" />
                                    </div>
                                    <p className="text-xs text-slate-400">{selectedSocialProfile.handle}</p>
                                </div>

                                <button
                                    onClick={() => handleToggleFollow(selectedSocialProfile.handle)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                        sikeState.followedHandles?.includes(selectedSocialProfile.handle)
                                            ? 'bg-slate-800 text-slate-300'
                                            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20'
                                    }`}
                                >
                                    {sikeState.followedHandles?.includes(selectedSocialProfile.handle) ? 'Following' : 'Follow'}
                                </button>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{selectedSocialProfile.bio}</p>

                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Followers</p>
                                    <p className="text-sm font-black text-white">{formatFollowerCount(selectedSocialProfile.metrics.followers)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Popularity</p>
                                    <p className="text-sm font-black text-cyan-400">{selectedSocialProfile.metrics.popularity}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Form Rating</p>
                                    <p className="text-sm font-black text-amber-400">⭐ {selectedSocialProfile.metrics.formRating}</p>
                                </div>
                            </div>

                            {/* Player Posts Feed Section */}
                            <div className="space-y-3 pt-2">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                    <span>📱 Posts & Performance Statements</span>
                                    <span className="text-[10px] text-cyan-400">
                                        {sikeState.posts.filter(p => p.authorHandle === selectedSocialProfile.handle || p.content.toLowerCase().includes(selectedSocialProfile.name.toLowerCase())).length} posts
                                    </span>
                                </h4>

                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                    {sikeState.posts.filter(p => p.authorHandle === selectedSocialProfile.handle || p.content.toLowerCase().includes(selectedSocialProfile.name.toLowerCase())).length === 0 ? (
                                        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                                            No Sike Share posts recorded yet for {selectedSocialProfile.name}. Play or simulate matches to see performance posts!
                                        </div>
                                    ) : (
                                        sikeState.posts
                                            .filter(p => p.authorHandle === selectedSocialProfile.handle || p.content.toLowerCase().includes(selectedSocialProfile.name.toLowerCase()))
                                            .map(post => (
                                                <div key={post.id} className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <div className="flex items-center gap-1.5 font-bold text-white">
                                                            <span>{post.authorName}</span>
                                                            {post.isVerified && <CheckCircle2 size={12} className="text-cyan-400" />}
                                                            {post.viralBadge && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-extrabold uppercase">
                                                                    {post.viralBadge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500">{post.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-200 leading-relaxed">{post.content}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-semibold border-t border-slate-900">
                                                        <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1 hover:text-rose-400 ${post.userLiked ? 'text-rose-500 font-black' : ''}`}>
                                                            <Heart size={12} className={post.userLiked ? 'fill-rose-500' : ''} />
                                                            <span>{post.likes}</span>
                                                        </button>
                                                        <button onClick={() => handleRepost(post.id)} className={`flex items-center gap-1 hover:text-teal-400 ${post.userReposted ? 'text-teal-400 font-black' : ''}`}>
                                                            <Repeat size={12} />
                                                            <span>{post.reposts}</span>
                                                        </button>
                                                        <div className="flex items-center gap-1">
                                                            <MessageSquare size={12} />
                                                            <span>{post.replies}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>

                            {selectedSocialProfile.playerObj && onViewPlayerProfile && (
                                <button
                                    onClick={() => {
                                        const p = selectedSocialProfile.playerObj!;
                                        setSelectedSocialProfile(null);
                                        onViewPlayerProfile(p);
                                    }}
                                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 rounded-xl transition-all mt-2"
                                >
                                    View Full Career Scouting Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* COMPOSE STATEMENT MODAL */}
            {showComposeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-black text-white">Post Official Statement on Sike Share</h3>
                            <button onClick={() => setShowComposeModal(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Share an official team update, trophy dedication, or fan message..."
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowComposeModal(false)}
                                className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePostStatement}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20"
                            >
                                Publish Statement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SikeShare;
