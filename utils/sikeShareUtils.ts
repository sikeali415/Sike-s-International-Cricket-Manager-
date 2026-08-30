import { GameData, MatchResult, SikePost, SikeShareState, SocialMetrics, ViralMoment, PressQuestion, Player, Team } from '../types';

export const formatFollowerCount = (num: number): string => {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + 'M';
    } else if (num >= 1_000) {
        return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toString();
};

export const generatePlayerHandle = (playerName: string): string => {
    const clean = playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `@${clean}`;
};

export const generateTeamHandle = (teamName: string): string => {
    const clean = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `@${clean}_fc`;
};

// Calculate likes, reposts, and replies proportionally based on follower count
export const calculateSocialEngagement = (followers: number, multiplier = 1.0) => {
    const followerCount = Math.max(50, followers);
    const engagementRate = 0.04 + Math.random() * 0.06; // 4% - 10%
    const likes = Math.max(15, Math.floor(followerCount * engagementRate * multiplier));
    const reposts = Math.max(3, Math.floor(likes * (0.15 + Math.random() * 0.1)));
    const replies = Math.max(2, Math.floor(likes * (0.04 + Math.random() * 0.04)));
    return { likes, reposts, replies };
};

// Initialize baseline social stats for players & teams
export const initSikeShareData = (gameData: GameData): SikeShareState => {
    const playerSocials: Record<string, SocialMetrics> = {};
    const teamSocials: Record<string, SocialMetrics> = {};

    // Initial player followers - ALL PLAYERS START FROM 0 FOLLOWERS AND 0 STATS
    gameData.allPlayers.forEach(p => {
        playerSocials[p.id] = {
            followers: 0,
            popularity: 0,
            reputation: 0,
            fanHappiness: 0,
            trendingScore: 0,
            formRating: 0,
            following: 0,
            bio: `${p.role} | ${p.nationality} Cricket International | In-game Sike Share Official Profile 🏏`,
            handle: generatePlayerHandle(p.name),
            isVerified: false
        };
    });

    // Initial team followers - ALL TEAMS START FROM 0 FOLLOWERS AND 0 STATS
    gameData.teams.forEach(t => {
        teamSocials[t.id] = {
            followers: 0,
            popularity: 0,
            reputation: 0,
            fanHappiness: 0,
            trendingScore: 0,
            formRating: 0,
            following: 0,
            bio: `Official Sike Share page of ${t.name}. Multi-format champions. #BleedColor 🏆`,
            handle: generateTeamHandle(t.name),
            isVerified: false
        };
    });

    const trendingHashtags = [
        { tag: '#CricketManager26', postCount: '0 posts', category: 'Trending in Sports' },
        { tag: '#SikeShare', postCount: '0 posts', category: 'Official Game Feed' },
        { tag: '#SuperOver', postCount: '0 posts', category: 'Match Thrillers' },
        { tag: '#TransferRumours', postCount: '0 posts', category: 'League News' },
        { tag: '#CenturyKing', postCount: '0 posts', category: 'Performances' },
        { tag: '#WorldCup2026', postCount: '0 posts', category: 'International' },
    ];

    const initialPosts: SikePost[] = [
        {
            id: 'post-init-1',
            authorName: 'CricNet Official',
            authorHandle: '@cricnet_official',
            authorRole: 'news',
            isVerified: true,
            content: `🚨 WELCOME TO SIKE SHARE! The ultimate living social network of Cricket Manager 26. Every player starts from 0 followers! Watch them build their social empire through performances, viral moments, and press reactions! 🔥🏏 #SikeShare #CricketManager26`,
            timestamp: 'Just now',
            likes: 0,
            reposts: 0,
            replies: 0,
            hashtags: ['#SikeShare', '#CricketManager26'],
            viralBadge: 'OFFICIAL ANNOUNCEMENT'
        },
        {
            id: 'post-init-2',
            authorName: 'Cricket Insider',
            authorHandle: '@cricketinsider_vip',
            authorRole: 'expert',
            isVerified: true,
            content: `The new season is under way! All players are starting from 0 followers. Who will gain the most Sike Share followers first this tournament? Vote below! 👇`,
            timestamp: '10m ago',
            likes: 0,
            reposts: 0,
            replies: 0,
            poll: {
                id: 'poll-init-1',
                question: 'Who will dominate Sike Share trends this season?',
                options: [
                    { id: 0, text: 'Top Order Batter', votes: 0 },
                    { id: 1, text: 'Fast Bowling Ace', votes: 0 },
                    { id: 2, text: 'All-Rounder Specialist', votes: 0 }
                ],
                totalVotes: 0
            }
        }
    ];

    return {
        posts: initialPosts,
        playerSocials,
        teamSocials,
        followedHandles: ['@cricnet_official', '@cricketinsider_vip'],
        trendingHashtags,
        viralMoments: [],
        hallOfFameStats: {
            totalFollowers: 0,
            leagueTitles: gameData.awardsHistory?.length || 0,
            worldCups: 0,
            aiReactionsCount: 0,
            mostTrendingPlayer: gameData.allPlayers[0]?.name || 'Cricket Legend'
        }
    };
};

// Process match outcomes and update followers, generate viral posts & press questions
export const processMatchSikeShareUpdate = async (
    matchResult: MatchResult,
    gameData: GameData
): Promise<Partial<SikeShareState>> => {
    const existingState: SikeShareState = gameData.sikeShareData || initSikeShareData(gameData);
    const updatedPlayerSocials = { ...existingState.playerSocials };
    const updatedTeamSocials = { ...existingState.teamSocials };
    const newPosts: SikePost[] = [];
    const newViralMoments: ViralMoment[] = [];

    const motmPlayer = matchResult.manOfTheMatch
        ? gameData.allPlayers.find(p => p.id === matchResult.manOfTheMatch.playerId)
        : null;

    const winnerTeam = gameData.teams.find(t => t.id === matchResult.winnerId);
    const loserTeam = gameData.teams.find(t => t.id === matchResult.loserId);

    const matchSummary = matchResult.summary || 'Competitive match completed!';
    const timestamp = 'Just now';

    // 1. Update Team Followers & Fan Happiness
    if (winnerTeam && updatedTeamSocials[winnerTeam.id]) {
        const gain = Math.floor(Math.random() * 15000) + 5000;
        updatedTeamSocials[winnerTeam.id].followers += gain;
        updatedTeamSocials[winnerTeam.id].fanHappiness = Math.min(100, updatedTeamSocials[winnerTeam.id].fanHappiness + 4);
    }
    if (loserTeam && updatedTeamSocials[loserTeam.id]) {
        const loss = Math.floor(Math.random() * 4000) + 1000;
        updatedTeamSocials[loserTeam.id].followers = Math.max(0, updatedTeamSocials[loserTeam.id].followers - loss);
        updatedTeamSocials[loserTeam.id].fanHappiness = Math.max(0, updatedTeamSocials[loserTeam.id].fanHappiness - 3);
    }

    // 2. MOTM Boost & Post
    if (motmPlayer) {
        const motmSocial = updatedPlayerSocials[motmPlayer.id] || {
            followers: 0,
            popularity: 0,
            reputation: 0,
            fanHappiness: 0,
            trendingScore: 0,
            formRating: 0,
            handle: generatePlayerHandle(motmPlayer.name),
            isVerified: false
        };

        const gain = Math.floor(Math.random() * 25000) + 12000;
        motmSocial.followers += gain;
        motmSocial.trendingScore = Math.min(100, motmSocial.trendingScore + 25);
        motmSocial.formRating = Math.min(10.0, motmSocial.formRating + 0.5);
        updatedPlayerSocials[motmPlayer.id] = motmSocial;

        const { likes, reposts, replies } = calculateSocialEngagement(motmSocial.followers, 1.5);

        // Player's OWN MOTM Post
        newPosts.push({
            id: `post-motm-player-${Date.now()}-${motmPlayer.id}`,
            authorName: motmPlayer.name,
            authorHandle: generatePlayerHandle(motmPlayer.name),
            authorRole: 'player',
            isVerified: true,
            content: `Honored to be named Player of the Match in Match ${matchResult.matchNumber}! ${matchResult.manOfTheMatch.summary || 'Huge team win!'} Thank you to all the fans for the incredible energy on Sike Share! 🏆❤️🔥 #${motmPlayer.name.replace(/\s+/g, '')} #${gameData.currentFormat.replace(/\s+/g, '')}`,
            timestamp,
            likes,
            reposts,
            replies,
            hashtags: [`#${motmPlayer.name.replace(/\s+/g, '')}`, '#PlayerOfTheMatch', '#Winner'],
            viralBadge: '🏆 PLAYER OF THE MATCH'
        });
    }

    // 3. Performers Posts: Scan all batters & bowlers for standout performances
    const allInnings = [matchResult.firstInning, matchResult.secondInning, matchResult.thirdInning, matchResult.fourthInning].filter(Boolean);
    
    allInnings.forEach(inning => {
        if (!inning) return;
        const isWinningTeamInning = inning.teamId === matchResult.winnerId;

        // Top Batters
        inning.batting?.forEach(b => {
            const p = gameData.allPlayers.find(px => px.id === b.playerId);
            if (!p) return;

            // Initialize or retrieve player social stats
            if (!updatedPlayerSocials[p.id]) {
                updatedPlayerSocials[p.id] = {
                    followers: 5000,
                    popularity: 50,
                    reputation: 50,
                    fanHappiness: 70,
                    trendingScore: 30,
                    formRating: 7.0,
                    handle: generatePlayerHandle(p.name),
                    isVerified: false
                };
            }

            // Century Post
            if (b.runs >= 100) {
                const extraFollowers = 50000;
                updatedPlayerSocials[p.id].followers += extraFollowers;
                updatedPlayerSocials[p.id].trendingScore = Math.min(100, updatedPlayerSocials[p.id].trendingScore + 30);

                const { likes, reposts, replies } = calculateSocialEngagement(updatedPlayerSocials[p.id].followers, 1.8);

                newViralMoments.push({
                    id: `vm-${Date.now()}-${p.id}`,
                    title: `🔥 MAGNIFICENT CENTURY!`,
                    type: b.runs >= 200 ? 'DOUBLE_CENTURY' : 'CENTURY',
                    playerId: p.id,
                    playerName: p.name,
                    followersChange: extraFollowers,
                    matchDescription: `${p.name} smashed ${b.runs} off ${b.balls} balls!`,
                    timestamp
                });

                newPosts.push({
                    id: `post-100-${Date.now()}-${p.id}`,
                    authorName: p.name,
                    authorHandle: generatePlayerHandle(p.name),
                    authorRole: 'player',
                    isVerified: true,
                    content: `What a special day out in the middle! Scored ${b.runs} runs (${b.balls}b, ${b.fours}x4, ${b.sixes}x6)! Huge thanks to the team and all fans supporting on Sike Share! ❤️🏏 #${p.name.replace(/\s+/g, '')} #Ton`,
                    timestamp,
                    likes,
                    reposts,
                    replies,
                    hashtags: ['#CenturyMasterclass', `#${p.name.replace(/\s+/g, '')}`],
                    viralBadge: '🔥 CENTURY KING'
                });
            } else if (b.runs >= 30) {
                // Solid Batting Performance Post
                const extraFollowers = Math.floor(Math.random() * 8000) + 3000;
                updatedPlayerSocials[p.id].followers += extraFollowers;

                const { likes, reposts, replies } = calculateSocialEngagement(updatedPlayerSocials[p.id].followers, 1.0);

                const toneText = isWinningTeamInning
                    ? `Pleased with my ${b.runs} runs off ${b.balls} balls today! Great team performance to get the job done. On to the next! 💪🔥`
                    : `Contributed ${b.runs} (${b.balls}b) today. Tough result for the team, but we analyze our errors and bounce back stronger! 👊`;

                newPosts.push({
                    id: `post-bat-${Date.now()}-${p.id}`,
                    authorName: p.name,
                    authorHandle: generatePlayerHandle(p.name),
                    authorRole: 'player',
                    isVerified: false,
                    content: toneText,
                    timestamp,
                    likes,
                    reposts,
                    replies,
                    hashtags: [`#${p.name.replace(/\s+/g, '')}`, '#CricketManager26']
                });
            }
        });

        // Top Bowlers
        inning.bowling?.forEach(bw => {
            const p = gameData.allPlayers.find(px => px.id === bw.playerId);
            if (!p) return;

            if (!updatedPlayerSocials[p.id]) {
                updatedPlayerSocials[p.id] = {
                    followers: 5000,
                    popularity: 50,
                    reputation: 50,
                    fanHappiness: 70,
                    trendingScore: 30,
                    formRating: 7.0,
                    handle: generatePlayerHandle(p.name),
                    isVerified: false
                };
            }

            if (bw.wickets >= 5) {
                const extraFollowers = 45000;
                updatedPlayerSocials[p.id].followers += extraFollowers;
                updatedPlayerSocials[p.id].trendingScore = Math.min(100, updatedPlayerSocials[p.id].trendingScore + 30);

                const { likes, reposts, replies } = calculateSocialEngagement(updatedPlayerSocials[p.id].followers, 1.6);

                newViralMoments.push({
                    id: `vm-5w-${Date.now()}-${p.id}`,
                    title: `🎯 5-WICKET HAUL CLINIC!`,
                    type: 'FIVE_WICKET_HAUL',
                    playerId: p.id,
                    playerName: p.name,
                    followersChange: extraFollowers,
                    matchDescription: `${p.name} bagged 5 wickets for ${bw.runsConceded} runs!`,
                    timestamp
                });

                newPosts.push({
                    id: `post-5w-player-${Date.now()}-${p.id}`,
                    authorName: p.name,
                    authorHandle: generatePlayerHandle(p.name),
                    authorRole: 'player',
                    isVerified: true,
                    content: `Everything came together today! Took 5 wickets (${bw.wickets}/${bw.runsConceded})! Loved the rhythm out there in the middle. Glory to God and thanks for the love! 🎯💥 #${p.name.replace(/\s+/g, '')} #5Wickets`,
                    timestamp,
                    likes,
                    reposts,
                    replies,
                    hashtags: ['#5Wickets', `#${p.name.replace(/\s+/g, '')}`],
                    viralBadge: '🎯 FIVE-WICKET HAUL'
                });
            } else if (bw.wickets >= 2) {
                const extraFollowers = Math.floor(Math.random() * 7000) + 2500;
                updatedPlayerSocials[p.id].followers += extraFollowers;

                const { likes, reposts, replies } = calculateSocialEngagement(updatedPlayerSocials[p.id].followers, 1.0);

                newPosts.push({
                    id: `post-bowl-${Date.now()}-${p.id}`,
                    authorName: p.name,
                    authorHandle: generatePlayerHandle(p.name),
                    authorRole: 'player',
                    isVerified: false,
                    content: `Stuck to my lines and picked up ${bw.wickets}/${bw.runsConceded} today. Always a blessing to contribute with the ball! 🎯🔥`,
                    timestamp,
                    likes,
                    reposts,
                    replies,
                    hashtags: [`#${p.name.replace(/\s+/g, '')}`]
                });
            }
        });
    });

    // 4. If User Team played in this match, generate interactive Press Question!
    const isUserMatch = winnerTeam?.id === gameData.userTeamId || loserTeam?.id === gameData.userTeamId;
    if (isUserMatch) {
        const isUserWinner = winnerTeam?.id === gameData.userTeamId;
        const journalistName = isUserWinner ? 'Alex Vance (Sky Cricket)' : 'Ravi Sharma (Cricket Today)';
        const journalistHandle = isUserWinner ? '@alexvance_sky' : '@ravisharma_cricket';
        
        const questionText = isUserWinner
            ? `Fantastic victory today! How do you rate your team's tactical execution and team morale after this result?`
            : `Disappointing defeat today. Critics are questioning your team selection and middle-order strategy. What went wrong?`;

        const pressQ: PressQuestion = {
            id: `press-${Date.now()}`,
            journalistName,
            journalistHandle,
            journalistOutlet: isUserWinner ? 'Sky Cricket' : 'Cricket Today',
            question: questionText,
            options: [
                {
                    type: 'calm',
                    text: isUserWinner ? '"We stayed disciplined and followed our game plan precisely."' : '"It is part of the sport. We will analyze mistakes and come back stronger."',
                    label: 'Calm & Analytical',
                    moraleImpact: 3,
                    fanImpact: 2,
                    boardImpact: 4
                },
                {
                    type: 'respectful',
                    text: isUserWinner ? '"Full credit to the entire squad and backroom staff for their hard work."' : '"The opposition played better cricket today. Hats off to them."',
                    label: 'Respectful & Humble',
                    moraleImpact: 5,
                    fanImpact: 5,
                    boardImpact: 3
                },
                {
                    type: 'aggressive',
                    text: isUserWinner ? '"We dominated every phase! Nobody in this league can touch us when we perform like this."' : '"Bad decisions cost us. The umpiring and pitch conditions were completely biased."',
                    label: 'Aggressive & Fiery',
                    moraleImpact: -2,
                    fanImpact: 8,
                    boardImpact: -5
                },
                {
                    type: 'ignore',
                    text: '"No comment on today\'s tactics. Next question please."',
                    label: 'No Comment / Dismissive',
                    moraleImpact: -4,
                    fanImpact: -5,
                    boardImpact: -2
                }
            ]
        };

        newPosts.unshift({
            id: `post-press-${Date.now()}`,
            authorName: journalistName,
            authorHandle: journalistHandle,
            authorRole: 'journalist',
            isVerified: true,
            content: `🎤 POST-MATCH PRESS CONFERENCE QUESTION for Manager of ${gameData.teams.find(t => t.id === gameData.userTeamId)?.name}:\n\n"${questionText}"`,
            timestamp: 'LIVE NOW',
            likes: 1200,
            reposts: 350,
            replies: 88,
            pressQuestion: pressQ,
            viralBadge: '🎤 PRESS CONFERENCE'
        });
    }

    // 5. Fan and community reactions
    newPosts.push({
        id: `post-fan-${Date.now()}-1`,
        authorName: 'Cricket Fanatic',
        authorHandle: '@cricket_fan_99',
        authorRole: 'fan',
        isVerified: false,
        content: `What a match! ${matchSummary} Love seeing this league on Sike Share! 🔥❤️ #CricketManager26`,
        timestamp: '2m ago',
        likes: Math.floor(Math.random() * 500) + 100,
        reposts: Math.floor(Math.random() * 90) + 20,
        replies: Math.floor(Math.random() * 40) + 10
    });

    // Combine posts with existing
    const updatedPosts = [...newPosts, ...existingState.posts].slice(0, 50); // Keep top 50 recent posts
    const updatedViralMoments = [...newViralMoments, ...existingState.viralMoments].slice(0, 20);

    return {
        posts: updatedPosts,
        playerSocials: updatedPlayerSocials,
        teamSocials: updatedTeamSocials,
        viralMoments: updatedViralMoments
    };
};
