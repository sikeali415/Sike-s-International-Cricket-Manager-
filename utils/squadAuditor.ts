import { Player, PlayerRole, BattingStyle, BowlingSubType, Team, Format } from '../types';
import { generateSingleFormatInitialStats } from '../data';
import { generatePlayerDomesticStats, generatePlayerInternationalStats } from './domesticStatsGenerator';
import { getAutomatedWeakness } from './playerRegistry';

export const MIN_ROLE_COUNTS = {
    [PlayerRole.WICKET_KEEPER]: 2,
    [PlayerRole.BATSMAN]: 6,
    [PlayerRole.FAST_BOWLER]: 5,
    [PlayerRole.SPIN_BOWLER]: 3,
    [PlayerRole.ALL_ROUNDER]: 4,
};

export const TARGET_MIN_SQUAD_SIZE = 20;
export const TARGET_MAX_SQUAD_SIZE = 25;

// Country-specific name banks for realistic authentic generation
const NAME_BANKS: Record<string, { firstNames: string[]; lastNames: string[] }> = {
    'Pakistan': {
        firstNames: ['Haris', 'Usman', 'Bilal', 'Zeeshan', 'Tariq', 'Kamran', 'Shahab', 'Faizan', 'Danish', 'Hamza', 'Saad', 'Umair', 'Waqas', 'Junaid', 'Kashif', 'Arsalan', 'Noman', 'Ibtisam', 'Mudassar', 'Tayyab'],
        lastNames: ['Khan', 'Ahmed', 'Ali', 'Shah', 'Malik', 'Raza', 'Butt', 'Cheema', 'Bhatti', 'Farooq', 'Qureshi', 'Siddiqui', 'Iqbal', 'Mirza', 'Hassan', 'Mahmood', 'Niazi', 'Gohar']
    },
    'India': {
        firstNames: ['Aditya', 'Rohan', 'Varun', 'Saurabh', 'Karthik', 'Manish', 'Dev', 'Shreyas', 'Prithvi', 'Mayank', 'Harshit', 'Tanush', 'Akshat', 'Abhishek', 'Ayush', 'Dhruv', 'Siddharth', 'Nitin'],
        lastNames: ['Sharma', 'Verma', 'Patel', 'Reddy', 'Chatterjee', 'Banerjee', 'Deshmukh', 'Chauhan', 'Pandey', 'Saxena', 'Bhattacharya', 'Singhania', 'Chopra', 'Kapoor', 'Menon', 'Jadhav']
    },
    'Australia': {
        firstNames: ['Darcy', 'Cooper', 'Lachlan', 'Harrison', 'Blake', 'Riley', 'Flynn', 'Mitchell', 'Hayden', 'Callum', 'Angus', 'Liam', 'Corey', 'Declan', 'Beau', 'Xavier', 'Jaxon', 'Brodie'],
        lastNames: ['Short', 'Hastings', 'Patterson', 'Boland', 'Moody', 'Ferguson', 'Doolan', 'Mennie', 'Silk', 'Wildermuth', 'Guthrie', 'Hardie', 'Stanlake', 'Sutherland', 'Rogers', 'Paris']
    },
    'England': {
        firstNames: ['Oliver', 'George', 'Arthur', 'Harry', 'Jack', 'Archie', 'Henry', 'Freddie', 'Leo', 'Theo', 'Charlie', 'Edward', 'Albie', 'Toby', 'Jude', 'Samson', 'Barnaby', 'Finley'],
        lastNames: ['Broadbent', 'Hain', 'Aldridge', 'Banton', 'Carse', 'Critchley', 'Duckett', 'Eskinazi', 'Gleeson', 'Hainote', 'Helm', 'Overton', 'Potts', 'Reece', 'Tongue', 'Wood']
    },
    'South Africa': {
        firstNames: ['Dewald', 'Pieter', 'Heinrich', 'Francois', 'Lungi', 'Marco', 'Wiaan', 'Rassie', 'Corbin', 'Eathan', 'Lutho', 'Beyers', 'Tristan', 'Andile', 'Migael', 'Sinethemba'],
        lastNames: ['Swanepoel', 'Klopper', 'Botha', 'Nel', 'Du Randt', 'Pretorius', 'Ackermann', 'Burger', 'Potgieter', 'Coetzee', 'Sipamla', 'Subrayen', 'Williams', 'Magala', 'Breetzke']
    },
    'New Zealand': {
        firstNames: ['Finn', 'Blair', 'Lockie', 'Cole', 'Hamish', 'Devon', 'Rachin', 'Glenn', 'Dane', 'Cam', 'Jacob', 'Will', 'Sean', 'Leo', 'Christian', 'Kieran'],
        lastNames: ['McConchie', 'Snedden', 'Tickner', 'Foxcroft', 'Ripon', 'Shipley', 'Clarkson', 'Bracewell', 'Cleaver', 'Duffy', 'Fisher', 'Rae', 'Severin', 'Smith', 'Foulkes']
    },
    'West Indies': {
        firstNames: ['Keacy', 'Romario', 'Akeal', 'Hayden', 'Gudakesh', 'Yannic', 'Sherfane', 'Dominic', 'Tevin', 'Kevlon', 'Anderson', 'Justin', 'Matthew', 'Ashmead', 'Ramon', 'Jermaine'],
        lastNames: ['Carty', 'Shepherd', 'Motie', 'Walsh', 'Sinclair', 'Drakes', 'Greaves', 'Imlach', 'Ottley', 'Springer', 'Nedd', 'McCollum', 'Primus', 'Louis', 'Warrican', 'Simmonds']
    },
    'Sri Lanka': {
        firstNames: ['Avishka', 'Charith', 'Pathum', 'Chamika', 'Dunith', 'Praveen', 'Ashen', 'Sahan', 'Nishan', 'Lahiru', 'Nuwanidu', 'Janith', 'Shevon', 'Kavishka', 'Tharindu', 'Muditha'],
        lastNames: ['Bandara', 'Wellalage', 'Jayawickrama', 'Arachchige', 'Madushanka', 'Liyanage', 'Fernando', 'Vandersay', 'Rathnayake', 'Croospulle', 'Daniel', 'Mendis', 'Perera']
    },
    'Afghanistan': {
        firstNames: ['Rahmanullah', 'Fazalhaq', 'Noor', 'Azmatullah', 'Naveen', 'Riaz', 'Wafadar', 'Zia', 'Ibrahim', 'Qais', 'Bilal', 'Abdul', 'Farid', 'Sharafuddin', 'Darwish', 'Izharulhaq'],
        lastNames: ['Farooqi', 'Omarzai', 'Murid', 'Hassan', 'Zadran', 'Momand', 'Samiullah', 'Rasooli', 'Naveed', 'Kharote', 'Gurbaz', 'Noori', 'Ishaq', 'Malik', 'Shinwari']
    },
    'Bangladesh': {
        firstNames: ['Towhid', 'Tanzid', 'Shoriful', 'Rishad', 'Hasan', 'Shamim', 'Parvez', 'Shahadat', 'Tanzim', 'Zakir', 'Mahmudul', 'Rejaur', 'Nasum', 'Khaled', 'Munim', 'Nahid'],
        lastNames: ['Hridoy', 'Tamim', 'Islam', 'Hossain', 'Patwari', 'Emon', 'Dipu', 'Sakib', 'Joy', 'Rahman', 'Rana', 'Ahmed', 'Mondol', 'Chowdhury', 'Mizan']
    },
    'Ireland': {
        firstNames: ['Lorcan', 'Curtis', 'Harry', 'Mark', 'Barry', 'Gareth', 'Neil', 'Fionn', 'Graham', 'Stephen', 'Matthew', 'Ben', 'Cade', 'Gavin', 'Ross', 'Theo'],
        lastNames: ['Tucker', 'Campher', 'Tector', 'Adair', 'McCarthy', 'Delany', 'Rock', 'Hand', 'Hume', 'Doheny', 'White', 'Hoey', 'Carmichael', 'Foster', 'McBrine']
    },
    'Zimbabwe': {
        firstNames: ['Wesley', 'Wessly', 'Richard', 'Blessing', 'Clive', 'Ryan', 'Innocent', 'Milton', 'Tony', 'Faraz', 'Joylord', 'Brad', 'Luke', 'Trevor', 'Tanunurwa', 'Victor'],
        lastNames: ['Madhwere', 'Ngarava', 'Muzarabani', 'Madande', 'Burl', 'Kaia', 'Shumba', 'Munyonga', 'Akram', 'Gumbie', 'Evans', 'Jongwe', 'Gwandu', 'Chivanga', 'Nyauchi']
    },
    'Netherlands': {
        firstNames: ['Bas', 'Scott', 'Max', 'Aryan', 'Teja', 'Roelof', 'Shariz', 'Vikramjit', 'Noah', 'Clayton', 'Kyle', 'Wesley', 'Olivier', 'Boris', 'Sebastiaan', 'Floris'],
        lastNames: ['de Leede', 'Edwards', 'O\'Dowd', 'Dutt', 'Nidamanuru', 'van der Merwe', 'Ahmad', 'Singh', 'Crozier', 'Floyd', 'Klein', 'Barresi', 'Elferink', 'Gorlee', 'Braat']
    },
    'Scotland': {
        firstNames: ['Matthew', 'George', 'Michael', 'Mark', 'Brandon', 'Safyaan', 'Chris', 'Hamza', 'Bradley', 'Jack', 'Oliver', 'Finlay', 'Mackintosh', 'Adrian', 'Andrew', 'Calum'],
        lastNames: ['Cross', 'Munsey', 'Leask', 'Watt', 'McMullen', 'Sharif', 'Sole', 'Tahir', 'Currie', 'Jarvis', 'Hairs', 'Main', 'Umeed', 'Gould', 'Davidson', 'Neill']
    },
    'USA': {
        firstNames: ['Monank', 'Aaron', 'Steven', 'Nosthush', 'Jessy', 'Ali', 'Saurabh', 'Milind', 'Nisarg', 'Shayan', 'Jasdeep', 'Abhishek', 'Gajanand', 'Sanjay', 'Harmeet', 'Juanoy'],
        lastNames: ['Patel', 'Jones', 'Taylor', 'Kenjige', 'Singh', 'Khan', 'Netravalkar', 'Kumar', 'Jahangir', 'Paradkar', 'Drysdale', 'Krishnamurthi', 'Bhangal', 'Vaghela']
    },
    'Nepal': {
        firstNames: ['Rohit', 'Dipendra', 'Kushal', 'Aasif', 'Sandeep', 'Sompal', 'Karan', 'Lalit', 'Gulshan', 'Kushal', 'Abinash', 'Bhim', 'Anil', 'Dev', 'Surya', 'Bibek'],
        lastNames: ['Paudel', 'Airee', 'Bhurtel', 'Sheikh', 'Lamichhane', 'Kami', 'KC', 'Rajbanshi', 'Jha', 'Malla', 'Bohara', 'Sharkee', 'Sah', 'Khanal', 'Tamang', 'Yadav']
    },
    'Namibia': {
        firstNames: ['Gerhard', 'JJ', 'Michael', 'Ruben', 'Jan', 'Tangeni', 'Bernard', 'Zane', 'Shaun', 'Malan', 'Dylan', 'Ben', 'Jack', 'Alexander', 'Niko', 'Morné'],
        lastNames: ['Erasmus', 'Smit', 'van Lingen', 'Trumpelmann', 'Frylinck', 'Lungameni', 'Scholtz', 'Green', 'Fouché', 'Kruger', 'Leicher', 'Shikongo', 'Brassell', 'Davids']
    },
    'Oman': {
        firstNames: ['Aqib', 'Zeeshan', 'Bilal', 'Fayyaz', 'Kaleemullah', 'Kashyap', 'Ayaan', 'Shoaib', 'Pratik', 'Wasim', 'Khalid', 'Rafiullah', 'Naseem', 'Mehran', 'Sufyan', 'Shakeel'],
        lastNames: ['Ilyas', 'Maqsood', 'Khan', 'Butt', 'Prajapati', 'Athavale', 'Ali', 'Odedra', 'Kail', 'Khushi', 'Ghori', 'Mahmood', 'Sanuth', 'Dhamba']
    },
    'Canada': {
        firstNames: ['Saad', 'Navneet', 'Nicholas', 'Pargat', 'Harsh', 'Dillon', 'Jeremy', 'Kaleem', 'Shreyas', 'Ammar', 'Ravinderpal', 'Rishiv', 'Uday', 'Aaron', 'Akhil', 'Kanwarpal'],
        lastNames: ['Bin Zafar', 'Dhaliwal', 'Kirton', 'Singh', 'Thaker', 'Heyliger', 'Gordon', 'Sana', 'Movva', 'Khalid', 'Joshi', 'Tathgur', 'Patel', 'Johnson', 'Kumar']
    },
    'UAE': {
        firstNames: ['Muhammad', 'Alishan', 'Basil', 'Junaid', 'Ali', 'Aayan', 'Aryansh', 'Zahoor', 'Karthik', 'Vriitya', 'Nilansh', 'Omid', 'Sanchit', 'Rahul', 'Dhruv', 'Ethan'],
        lastNames: ['Waseem', 'Sharafu', 'Hameed', 'Siddique', 'Naseer', 'Afzal', 'Sharma', 'Khan', 'Meiyappan', 'Aravind', 'Keswani', 'Rahman', 'Chopra', 'D\'Souza']
    }
};

/**
 * Helper to generate a realistic authentic fictional player for a given nationality & role.
 */
export const generateFictionalPlayer = (
    nationality: string,
    role: PlayerRole,
    indexSeed: number
): Player => {
    const bank = NAME_BANKS[nationality] || NAME_BANKS['Pakistan'];
    const firstName = bank.firstNames[Math.floor(Math.random() * bank.firstNames.length)];
    const lastName = bank.lastNames[Math.floor(Math.random() * bank.lastNames.length)];
    const name = `${firstName} ${lastName}`;

    const age = 19 + Math.floor(Math.random() * 14); // Age 19 to 32
    const styles: BattingStyle[] = ['N', 'A', 'D', 'NA'];
    const style = styles[Math.floor(Math.random() * styles.length)];

    let battingSkill = 30;
    let secondarySkill = 30;
    let bowlingSubType: BowlingSubType | undefined = undefined;

    if (role === PlayerRole.BATSMAN) {
        battingSkill = 62 + Math.floor(Math.random() * 11); // 62 - 72
        secondarySkill = 15 + Math.floor(Math.random() * 20); // 15 - 34
    } else if (role === PlayerRole.WICKET_KEEPER) {
        battingSkill = 60 + Math.floor(Math.random() * 12); // 60 - 71
        secondarySkill = 62 + Math.floor(Math.random() * 10); // Keeping skill representation 62 - 71
    } else if (role === PlayerRole.ALL_ROUNDER) {
        battingSkill = 58 + Math.floor(Math.random() * 12); // 58 - 69
        secondarySkill = 58 + Math.floor(Math.random() * 12); // 58 - 69
        const arSubTypes: BowlingSubType[] = ['mv', 'os', 'ls', 'fb', 'laos', 'lac', 'm'];
        bowlingSubType = arSubTypes[Math.floor(Math.random() * arSubTypes.length)];
    } else if (role === PlayerRole.FAST_BOWLER) {
        battingSkill = 18 + Math.floor(Math.random() * 18); // 18 - 35
        secondarySkill = 63 + Math.floor(Math.random() * 10); // 63 - 72
        const fastTypes: BowlingSubType[] = ['fb', 'fbs', 'mv'];
        bowlingSubType = fastTypes[Math.floor(Math.random() * fastTypes.length)];
    } else if (role === PlayerRole.SPIN_BOWLER) {
        battingSkill = 18 + Math.floor(Math.random() * 18); // 18 - 35
        secondarySkill = 63 + Math.floor(Math.random() * 10); // 63 - 72
        const spinTypes: BowlingSubType[] = ['os', 'ls', 'laos', 'lac'];
        bowlingSubType = spinTypes[Math.floor(Math.random() * spinTypes.length)];
    }

    const id = `gen-${nationality.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3)}-${role.toLowerCase().slice(0, 2)}-${Date.now().toString(36)}-${indexSeed}`;
    const isForeign = nationality.toLowerCase() !== 'pakistan';

    const playerObj: Player = {
        id,
        name,
        age,
        nationality,
        role,
        battingSkill,
        secondarySkill,
        style,
        bowlingSubType,
        isForeign,
        isOpener: role === PlayerRole.BATSMAN && Math.random() > 0.6,
        isFinisher: (role === PlayerRole.BATSMAN || role === PlayerRole.ALL_ROUNDER) && Math.random() > 0.6,
        isPowerHitter: style === 'A' && Math.random() > 0.5,
        stats: {
            [Format.T20]: generateSingleFormatInitialStats(),
            [Format.ODI]: generateSingleFormatInitialStats(),
            [Format.SHIELD]: generateSingleFormatInitialStats(),
            [Format.WLT20]: generateSingleFormatInitialStats(),
        },
        domesticStats: generatePlayerDomesticStats({
            id,
            name,
            age,
            role,
            battingSkill,
            secondarySkill,
            style,
            isOpener: role === PlayerRole.BATSMAN && Math.random() > 0.6,
            isFinisher: (role === PlayerRole.BATSMAN || role === PlayerRole.ALL_ROUNDER) && Math.random() > 0.6,
            isPowerHitter: style === 'A' && Math.random() > 0.5
        }),
        internationalStats: generatePlayerInternationalStats(),
        form: 75 + Math.floor(Math.random() * 15),
        basePrice: parseFloat((Math.max(battingSkill, secondarySkill) * 0.05).toFixed(2)),
        healthStatus: 'fit'
    };

    playerObj.weaknesses = getAutomatedWeakness(playerObj);
    return playerObj;
};

/**
 * Audits a single team's squad and ensures complete role coverage and minimum squad size (18-25 players).
 * Fills any deficiencies with generated fictional players matching the team's nationality.
 */
export const auditAndFillTeamSquad = (
    team: Team,
    existingAllPlayers: Player[]
): { updatedTeam: Team; newPlayersCreated: Player[] } => {
    const squad = [...team.squad];
    const newPlayersCreated: Player[] = [];
    let seedCounter = 1;

    // Helper to count current roles
    const getRoleCounts = () => {
        const counts = {
            [PlayerRole.WICKET_KEEPER]: 0,
            [PlayerRole.BATSMAN]: 0,
            [PlayerRole.FAST_BOWLER]: 0,
            [PlayerRole.SPIN_BOWLER]: 0,
            [PlayerRole.ALL_ROUNDER]: 0,
        };
        squad.forEach(p => {
            if (counts[p.role] !== undefined) {
                counts[p.role]++;
            }
        });
        return counts;
    };

    // 1. Enforce minimum role coverage
    const currentCounts = getRoleCounts();
    const rolesToAudit: PlayerRole[] = [
        PlayerRole.WICKET_KEEPER,
        PlayerRole.BATSMAN,
        PlayerRole.FAST_BOWLER,
        PlayerRole.SPIN_BOWLER,
        PlayerRole.ALL_ROUNDER
    ];

    for (const role of rolesToAudit) {
        const minNeeded = MIN_ROLE_COUNTS[role];
        const deficit = minNeeded - (currentCounts[role] || 0);
        if (deficit > 0) {
            for (let i = 0; i < deficit; i++) {
                const newPlayer = generateFictionalPlayer(team.name, role, seedCounter++);
                squad.push(newPlayer);
                newPlayersCreated.push(newPlayer);
            }
        }
    }

    // 2. Enforce minimum squad size (TARGET_MIN_SQUAD_SIZE = 20)
    while (squad.length < TARGET_MIN_SQUAD_SIZE) {
        const counts = getRoleCounts();
        // Determine which role is least represented proportionally
        let roleToAdd = PlayerRole.BATSMAN;
        if (counts[PlayerRole.FAST_BOWLER] < 6) {
            roleToAdd = PlayerRole.FAST_BOWLER;
        } else if (counts[PlayerRole.ALL_ROUNDER] < 5) {
            roleToAdd = PlayerRole.ALL_ROUNDER;
        } else if (counts[PlayerRole.SPIN_BOWLER] < 4) {
            roleToAdd = PlayerRole.SPIN_BOWLER;
        } else if (counts[PlayerRole.BATSMAN] < 7) {
            roleToAdd = PlayerRole.BATSMAN;
        } else if (counts[PlayerRole.WICKET_KEEPER] < 3) {
            roleToAdd = PlayerRole.WICKET_KEEPER;
        }

        const newPlayer = generateFictionalPlayer(team.name, roleToAdd, seedCounter++);
        squad.push(newPlayer);
        newPlayersCreated.push(newPlayer);
    }

    return {
        updatedTeam: {
            ...team,
            squad
        },
        newPlayersCreated
    };
};

/**
 * Audits all teams in the game, enforcing role coverage and squad depth for every team.
 * Also synchronizes the global `allPlayers` registry.
 */
export const auditAndEnforceAllSquads = (
    teams: Team[],
    allPlayers: Player[]
): { auditedTeams: Team[]; auditedAllPlayers: Player[] } => {
    const existingPlayerMap = new Map<string, Player>();
    allPlayers.forEach(p => existingPlayerMap.set(p.id, p));

    const auditedTeams: Team[] = [];
    const createdPlayers: Player[] = [];

    for (const team of teams) {
        const { updatedTeam, newPlayersCreated } = auditAndFillTeamSquad(team, allPlayers);
        auditedTeams.push(updatedTeam);
        newPlayersCreated.forEach(np => {
            createdPlayers.push(np);
            existingPlayerMap.set(np.id, np);
        });
        // Also update existing squad players in player map
        updatedTeam.squad.forEach(sp => {
            existingPlayerMap.set(sp.id, sp);
        });
    }

    return {
        auditedTeams,
        auditedAllPlayers: Array.from(existingPlayerMap.values())
    };
};
