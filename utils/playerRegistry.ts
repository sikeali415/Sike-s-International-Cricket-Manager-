
import { Player, PlayerRole, BattingStyle, BowlingSubType, Format, RawPlayerData } from '../types';
import { generateInitialStats } from '../data';
import { generatePlayerDomesticStats, generatePlayerInternationalStats } from './domesticStatsGenerator';
import { RAW_INTERNATIONAL_ALL } from './internationalRoster';

const bowlingTypeMap: Record<string, BowlingSubType> = {
    'ls': 'ls', 'os': 'os', 'lals': 'lals', 'laos': 'laos', 'lac': 'lac',
    'mv': 'mv', 'fb': 'fb', 'fbs': 'fbs', 'm': 'm'
};

const roleMap: Record<string, PlayerRole> = {
    'AR': PlayerRole.ALL_ROUNDER,
    'WK': PlayerRole.WICKET_KEEPER,
    'BL': PlayerRole.FAST_BOWLER, // Default BL to Fast, modified later if SB
    'SB': PlayerRole.SPIN_BOWLER,
    'BT': PlayerRole.BATSMAN
};

const styleMap: Record<string, BattingStyle> = {
    'A': 'A', 'D': 'D', 'N': 'N', 'NA': 'NA'
};

export const parseRawData = (data: RawPlayerData[]): Player[] => {
    return data.map(p => {
        const role = roleMap[p.role] || PlayerRole.BATSMAN;
        const style = (styleMap[p.style] || 'N') as BattingStyle;
        const weaknesses = p.weakness ? p.weakness.split('&').map(s => bowlingTypeMap[s.trim()] || 'none').filter(s => s !== 'none') as BowlingSubType[] : undefined;
        
        let subType: BowlingSubType | undefined = undefined;
        if (p.traits) {
            const foundType = p.traits.find(t => bowlingTypeMap[t]);
            if (foundType) subType = bowlingTypeMap[foundType];
        }
        // Check if role was SB but mapping said BL
        const finalRole = p.role === 'SB' ? PlayerRole.SPIN_BOWLER : role;

        const playerData = {
            id: p.id,
            name: p.name,
            age: p.age,
            nationality: p.nationality,
            role: finalRole,
            battingSkill: p.batting,
            secondarySkill: p.bowling,
            style: style,
            isOpener: p.pos?.includes('OP') || false,
            isForeign: p.isForeign,
            isFinisher: p.pos?.includes('Finisher') || p.traits?.includes('Finisher'),
            isPowerHitter: p.traits?.includes('Power Hitter'),
            bowlingSubType: subType,
            weaknesses: weaknesses,
            stats: generateInitialStats(),
            domesticStats: generatePlayerDomesticStats({
                id: p.id,
                name: p.name,
                age: p.age,
                role: finalRole,
                battingSkill: p.batting,
                secondarySkill: p.bowling,
                style: style,
                isOpener: p.pos?.includes('OP') || false,
                isFinisher: p.pos?.includes('Finisher') || p.traits?.includes('Finisher'),
                isPowerHitter: p.traits?.includes('Power Hitter')
            }),
            internationalStats: generatePlayerInternationalStats(),
        };

        return playerData;
    });
};

export const RAW_DATA_INTERNATIONAL: RawPlayerData[] = [
    // Australia
    { id: 'int-au-1', name: 'A. Haddin', age: 35, nationality: 'Australia', role: 'AR', batting: 65, bowling: 56, style: 'A', isForeign: true, pos: 'Finisher', weakness: 'ls & fbs' },
    { id: 'int-au-2', name: 'Langer', age: 32, nationality: 'Australia', role: 'BL', batting: 22, bowling: 72, style: 'D', isForeign: true, traits: ['fbs'] },
    { id: 'int-au-3', name: 'Parsh', age: 26, nationality: 'Australia', role: 'WK', batting: 76, bowling: 0, style: 'N', isForeign: true, pos: 'OP' },
    { id: 'int-au-4', name: 'Mausechate', age: 28, nationality: 'Australia', role: 'BT', batting: 69, bowling: 23, style: 'A', isForeign: true, pos: 'Finisher' },
    { id: 'int-au-5', name: 'Wade', age: 34, nationality: 'Australia', role: 'BL', batting: 25, bowling: 84, style: 'D', isForeign: true, traits: ['fbs'] },
    { id: 'int-au-6', name: 'Lance', age: 24, nationality: 'Australia', role: 'BT', batting: 76, bowling: 0, style: 'N', isForeign: true, pos: 'OP' },
    { id: 'int-au-7', name: 'M.G. Glaxen', age: 31, nationality: 'Australia', role: 'AR', batting: 82, bowling: 65, style: 'A', isForeign: true, pos: 'OP', traits: ['ls', 'Power Hitter'] },
    { id: 'int-au-8', name: 'J. Harris', age: 29, nationality: 'Australia', role: 'AR', batting: 56, bowling: 45, style: 'N', isForeign: true, pos: 'Finisher', traits: ['m'] },
    { id: 'int-au-9', name: 'Lin', age: 23, nationality: 'Australia', role: 'BL', batting: 34, bowling: 68, style: 'N', isForeign: true, traits: ['fb'] },
    { id: 'int-au-10', name: 'Wilton', age: 30, nationality: 'Australia', role: 'AR', batting: 72, bowling: 64, style: 'N', isForeign: true, traits: ['mv'] },

    // New Zealand
    { id: 'int-nz-1', name: 'Waller', age: 27, nationality: 'New Zealand', role: 'BL', batting: 23, bowling: 67, style: 'N', isForeign: true, traits: ['mv'] },
    { id: 'int-nz-2', name: 'B. Rington', age: 25, nationality: 'New Zealand', role: 'AR', batting: 45, bowling: 56, style: 'N', isForeign: true, pos: 'Finisher', traits: ['fb'] },
    { id: 'int-nz-3', name: 'Addams', age: 29, nationality: 'New Zealand', role: 'AR', batting: 55, bowling: 45, style: 'N', isForeign: true, pos: 'Finisher', traits: ['fb'] },
    { id: 'int-nz-4', name: 'S. Warner', age: 37, nationality: 'Australia', role: 'BT', batting: 76, bowling: 33, style: 'A', isForeign: true, pos: 'OP' },
    { id: 'int-nz-5', name: 'Sprike', age: 31, nationality: 'England', role: 'WK', batting: 80, bowling: 0, style: 'A', isForeign: true, pos: 'OP' },

    // West Indies
    { id: 'int-wi-1', name: 'Jordan', age: 24, nationality: 'West Indies', role: 'BL', batting: 23, bowling: 66, style: 'N', isForeign: true, traits: ['fb'] },
    { id: 'int-wi-2', name: 'N. Fill', age: 22, nationality: 'West Indies', role: 'SB', batting: 22, bowling: 68, style: 'N', isForeign: true, traits: ['lac'] },
    { id: 'int-wi-3', name: 'A. Chadwick', age: 32, nationality: 'West Indies', role: 'WK', batting: 73, bowling: 0, style: 'A', isForeign: true, pos: 'OP' },

    // Sri Lanka
    { id: 'int-sl-1', name: 'Sriwardna', age: 35, nationality: 'Sri Lanka', role: 'BT', batting: 67, bowling: 0, style: 'D', isForeign: true },
    { id: 'int-sl-2', name: 'C. Dhanushka', age: 37, nationality: 'Sri Lanka', role: 'AR', batting: 45, bowling: 66, style: 'D', isForeign: true, traits: ['ls'] },

    // South Africa
    { id: 'int-sa-1', name: 'James', age: 34, nationality: 'South Africa', role: 'AR', batting: 63, bowling: 66, style: 'A', isForeign: true, traits: ['lals'] },
    { id: 'int-sa-2', name: 'Aram', age: 31, nationality: 'South Africa', role: 'AR', batting: 45, bowling: 66, style: 'D', isForeign: true, traits: ['os'] },

    // England
    { id: 'int-en-1', name: 'N. Colin', age: 29, nationality: 'England', role: 'AR', batting: 70, bowling: 61, style: 'N', isForeign: true, traits: ['laos'] },
    { id: 'int-en-2', name: 'D. Quentin', age: 28, nationality: 'England', role: 'BT', batting: 56, bowling: 23, style: 'N', isForeign: true },
];

export const RAW_DATA_SPINNERS: RawPlayerData[] = [
    { id: 'sb-1', name: 'Rahat', age: 24, nationality: 'Pakistan', role: 'SB', batting: 12, bowling: 59, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-2', name: 'Abrar', age: 26, nationality: 'Pakistan', role: 'SB', batting: 22, bowling: 62, style: 'D', isForeign: false, traits: ['os'] },
    { id: 'sb-3', name: 'Anwar', age: 26, nationality: 'Pakistan', role: 'SB', batting: 28, bowling: 81, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-4', name: 'Arshad', age: 28, nationality: 'Pakistan', role: 'SB', batting: 22, bowling: 56, style: 'D', isForeign: false, traits: ['ls'] },
    { id: 'sb-5', name: 'Mehrab', age: 22, nationality: 'Pakistan', role: 'SB', batting: 16, bowling: 62, style: 'D', isForeign: false, traits: ['lals'] },
    { id: 'sb-6', name: 'Bilal', age: 21, nationality: 'Pakistan', role: 'SB', batting: 40, bowling: 78, style: 'N', isForeign: false },
    { id: 'sb-7', name: 'Adnan', age: 28, nationality: 'Pakistan', role: 'SB', batting: 12, bowling: 56, style: 'D', isForeign: false, traits: ['laos'] },
    { id: 'sb-8', name: 'Riaz', age: 22, nationality: 'Pakistan', role: 'SB', batting: 11, bowling: 55, style: 'N', isForeign: false, traits: ['lac'] },
    { id: 'sb-9', name: 'Amjad', age: 22, nationality: 'Pakistan', role: 'SB', batting: 30, bowling: 69, style: 'D', isForeign: false, traits: ['os'] },
    { id: 'sb-10', name: 'Rehan', age: 22, nationality: 'Pakistan', role: 'SB', batting: 12, bowling: 61, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-11', name: 'N. Samad', age: 26, nationality: 'Pakistan', role: 'SB', batting: 23, bowling: 55, style: 'D', isForeign: false, traits: ['lac'] },
    { id: 'sb-12', name: 'M. Amjad', age: 30, nationality: 'Pakistan', role: 'SB', batting: 45, bowling: 68, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-13', name: 'Asim', age: 22, nationality: 'Pakistan', role: 'SB', batting: 23, bowling: 71, style: 'D', isForeign: false, traits: ['os'] },
];

export const RAW_DATA_ALLROUNDERS: RawPlayerData[] = [
    { id: 'ar-1', name: 'Khalid', age: 25, nationality: 'Pakistan', role: 'AR', batting: 54, bowling: 45, style: 'N', isForeign: false, traits: ['lals'] },
    { id: 'ar-2', name: 'Taimoor', age: 25, nationality: 'Pakistan', role: 'AR', batting: 56, bowling: 51, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-3', name: 'Saeed', age: 27, nationality: 'Pakistan', role: 'AR', batting: 60, bowling: 58, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-4', name: 'Najaf', age: 35, nationality: 'Pakistan', role: 'AR', batting: 41, bowling: 63, style: 'D', isForeign: false, traits: ['ls'] },
    { id: 'ar-5', name: 'Jahangir', age: 36, nationality: 'Pakistan', role: 'AR', batting: 60, bowling: 58, style: 'D', isForeign: false, pos: 'Finisher', traits: ['os'] },
    { id: 'ar-6', name: 'M. Asghar', age: 24, nationality: 'Pakistan', role: 'AR', batting: 56, bowling: 55, style: 'N', isForeign: false, pos: 'Finisher', traits: ['m'] },
    { id: 'ar-7', name: 'Amir', age: 37, nationality: 'Pakistan', role: 'AR', batting: 81, bowling: 85, style: 'NA', isForeign: false, traits: ['ls'] },
    { id: 'ar-8', name: 'Mansoor', age: 23, nationality: 'Pakistan', role: 'AR', batting: 55, bowling: 65, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'ar-9', name: 'Aftab', age: 26, nationality: 'Pakistan', role: 'AR', batting: 70, bowling: 61, style: 'NA', isForeign: false, pos: 'OP', traits: ['os'] },
    { id: 'ar-10', name: 'Wahab', age: 35, nationality: 'Pakistan', role: 'AR', batting: 50, bowling: 51, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-11', name: 'Aaqib Raza', age: 25, nationality: 'Pakistan', role: 'AR', batting: 78, bowling: 70, style: 'A', isForeign: false, traits: ['fb'] },
    { id: 'ar-12', name: 'Sike', age: 25, nationality: 'Pakistan', role: 'AR', batting: 87, bowling: 85, style: 'NA', isForeign: false, pos: 'OP', traits: ['fbs'] },
    { id: 'ar-13', name: 'Nawaz', age: 23, nationality: 'Pakistan', role: 'AR', batting: 57, bowling: 67, style: 'A', isForeign: false, traits: ['mv'] },
    { id: 'ar-14', name: 'Muhammad Tahir', age: 29, nationality: 'Pakistan', role: 'AR', batting: 60, bowling: 56, style: 'A', isForeign: false, traits: ['m'] },
    { id: 'ar-15', name: 'Irfaan Ali', age: 28, nationality: 'Pakistan', role: 'AR', batting: 70, bowling: 56, style: 'N', isForeign: false, traits: ['os'] },
];

export const RAW_DATA_WK: RawPlayerData[] = [
    { id: 'wk-1', name: 'M. Imran', age: 24, nationality: 'Pakistan', role: 'WK', batting: 68, bowling: 60, style: 'A', isForeign: false },
    { id: 'wk-2', name: 'S. Khan', age: 24, nationality: 'Pakistan', role: 'WK', batting: 75, bowling: 87, style: 'D', isForeign: false, pos: 'OP' },
    { id: 'wk-3', name: 'Ali', age: 24, nationality: 'Pakistan', role: 'WK', batting: 60, bowling: 67, style: 'D', isForeign: false },
    { id: 'wk-4', name: 'A. Sajjad', age: 34, nationality: 'Pakistan', role: 'WK', batting: 55, bowling: 69, style: 'N', isForeign: false },
    { id: 'wk-5', name: 'Zulqarnain', age: 24, nationality: 'Pakistan', role: 'WK', batting: 70, bowling: 78, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-6', name: 'Haseebullah', age: 21, nationality: 'Pakistan', role: 'WK', batting: 72, bowling: 78, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-7', name: 'Shahid Latif', age: 31, nationality: 'Pakistan', role: 'WK', batting: 59, bowling: 67, style: 'N', isForeign: false },
    { id: 'wk-8', name: 'Yaqoob', age: 22, nationality: 'Pakistan', role: 'WK', batting: 63, bowling: 68, style: 'D', isForeign: false },
    { id: 'wk-9', name: 'I. Javed', age: 22, nationality: 'Pakistan', role: 'WK', batting: 84, bowling: 85, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-10', name: 'M. Amin', age: 24, nationality: 'Pakistan', role: 'WK', batting: 79, bowling: 80, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-11', name: 'Aslam Sattar', age: 24, nationality: 'Pakistan', role: 'WK', batting: 55, bowling: 60, style: 'D', isForeign: false },
    { id: 'wk-12', name: 'Atiq Ali', age: 26, nationality: 'Pakistan', role: 'WK', batting: 62, bowling: 72, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-13', name: 'Zahid', age: 22, nationality: 'Pakistan', role: 'WK', batting: 77, bowling: 76, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-14', name: 'Uddin Ali', age: 26, nationality: 'Pakistan', role: 'WK', batting: 55, bowling: 65, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-15', name: 'R. Saad', age: 22, nationality: 'Pakistan', role: 'WK', batting: 60, bowling: 70, style: 'N', isForeign: false },
];

export const RAW_DATA_FAST: RawPlayerData[] = [
    { id: 'bl-1', name: 'Ilyas', age: 24, nationality: 'Pakistan', role: 'BL', batting: 11, bowling: 63, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-2', name: 'Waheed', age: 29, nationality: 'Pakistan', role: 'BL', batting: 10, bowling: 55, style: 'D', isForeign: false, traits: ['mv'] },
    { id: 'bl-3', name: 'M. Ali', age: 23, nationality: 'Pakistan', role: 'BL', batting: 23, bowling: 67, style: 'D', isForeign: false, traits: ['mv'] },
    { id: 'bl-4', name: 'Sohail', age: 39, nationality: 'Pakistan', role: 'BL', batting: 24, bowling: 75, style: 'D', isForeign: false, traits: ['fbs'] },
    { id: 'bl-5', name: 'Zia', age: 25, nationality: 'Pakistan', role: 'BL', batting: 23, bowling: 72, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-6', name: 'Azam', age: 25, nationality: 'Pakistan', role: 'BL', batting: 23, bowling: 70, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-7', name: 'Faraz Khan', age: 21, nationality: 'Pakistan', role: 'BL', batting: 12, bowling: 56, style: 'N', isForeign: false, traits: ['mv'] },
    { id: 'bl-8', name: 'Waleed', age: 25, nationality: 'Pakistan', role: 'BL', batting: 23, bowling: 55, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-9', name: 'Atif Maqbool', age: 27, nationality: 'Pakistan', role: 'BL', batting: 12, bowling: 53, style: 'N', isForeign: false, traits: ['m'] },
    { id: 'bl-10', name: 'Rizwan', age: 29, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 70, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-11', name: 'Salman', age: 23, nationality: 'Pakistan', role: 'BL', batting: 30, bowling: 73, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-12', name: 'Naseem', age: 23, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 81, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-13', name: 'Aramzad', age: 23, nationality: 'Pakistan', role: 'BL', batting: 25, bowling: 85, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-14', name: 'M. Arif', age: 30, nationality: 'Pakistan', role: 'BL', batting: 12, bowling: 55, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-15', name: 'Waheed (2)', age: 24, nationality: 'Pakistan', role: 'BL', batting: 16, bowling: 59, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-16', name: 'Naeem', age: 29, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 75, style: 'N', isForeign: false, traits: ['mv'] },
    { id: 'bl-17', name: 'Akhlaq', age: 24, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 69, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-18', name: 'Ahsan', age: 26, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 78, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-19', name: 'Farhan', age: 24, nationality: 'Pakistan', role: 'BL', batting: 24, bowling: 80, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-20', name: 'N. Javed', age: 22, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 49, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-21', name: 'Sohail Ahmed', age: 25, nationality: 'Pakistan', role: 'BL', batting: 23, bowling: 46, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-22', name: 'Muzafar', age: 24, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 71, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-23', name: 'Sameen', age: 28, nationality: 'Pakistan', role: 'BL', batting: 22, bowling: 72, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-24', name: 'Zohaib', age: 21, nationality: 'Pakistan', role: 'BL', batting: 36, bowling: 85, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-25', name: 'Iqrar', age: 22, nationality: 'Pakistan', role: 'BL', batting: 19, bowling: 90, style: 'D', isForeign: false, traits: ['fbs'] },
];

export const RAW_DATA_BT: RawPlayerData[] = [
    { id: 'bt-1', name: 'Jahid', age: 27, nationality: 'Pakistan', role: 'BT', batting: 61, bowling: 22, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-2', name: 'Shahid', age: 28, nationality: 'Pakistan', role: 'BT', batting: 68, bowling: 45, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'bt-3', name: 'Altaf', age: 30, nationality: 'Pakistan', role: 'BT', batting: 55, bowling: 10, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-4', name: 'Yasir', age: 25, nationality: 'Pakistan', role: 'BT', batting: 67, bowling: 12, style: 'N', isForeign: false },
    { id: 'bt-5', name: 'Nauman', age: 28, nationality: 'Pakistan', role: 'BT', batting: 72, bowling: 12, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-6', name: 'Nasir', age: 26, nationality: 'Pakistan', role: 'BT', batting: 81, bowling: 48, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'bt-7', name: 'Haider', age: 24, nationality: 'Pakistan', role: 'BT', batting: 62, bowling: 25, style: 'N', isForeign: false, pos: 'Top 4' },
    { id: 'bt-8', name: 'Asad', age: 28, nationality: 'Pakistan', role: 'BT', batting: 60, bowling: 11, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-9', name: 'Siraj', age: 30, nationality: 'Pakistan', role: 'BT', batting: 63, bowling: 22, style: 'D', isForeign: false, pos: 'OP' },
    { id: 'bt-10', name: 'Aziz', age: 24, nationality: 'Pakistan', role: 'BT', batting: 53, bowling: 22, style: 'A', isForeign: false },
    { id: 'bt-11', name: 'Aslam', age: 28, nationality: 'Pakistan', role: 'BT', batting: 71, bowling: 12, style: 'D', isForeign: false },
    { id: 'bt-12', name: 'Abid', age: 32, nationality: 'Pakistan', role: 'BT', batting: 79, bowling: 45, style: 'NA', isForeign: false, pos: 'Top 4' },
    { id: 'bt-13', name: 'Husnain', age: 28, nationality: 'Pakistan', role: 'BT', batting: 72, bowling: 22, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-14', name: 'Qasim', age: 28, nationality: 'Pakistan', role: 'BT', batting: 45, bowling: 12, style: 'N', isForeign: false },
    { id: 'bt-15', name: 'K. Navid', age: 29, nationality: 'Pakistan', role: 'BT', batting: 72, bowling: 45, style: 'N', isForeign: false },
    { id: 'bt-16', name: 'Shoaib Khan', age: 31, nationality: 'Pakistan', role: 'BT', batting: 56, bowling: 25, style: 'D', isForeign: false, pos: 'Finisher' },
    { id: 'bt-17', name: 'A. Usman', age: 23, nationality: 'Pakistan', role: 'BT', batting: 53, bowling: 22, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-18', name: 'Aafaq', age: 22, nationality: 'Pakistan', role: 'BT', batting: 50, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-19', name: 'Fakhrudin', age: 26, nationality: 'Pakistan', role: 'BT', batting: 70, bowling: 23, style: 'D', isForeign: false },
    { id: 'bt-20', name: 'A. Hafeez', age: 29, nationality: 'Pakistan', role: 'BT', batting: 68, bowling: 11, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-21', name: 'Hamid Hasan', age: 28, nationality: 'Pakistan', role: 'BT', batting: 70, bowling: 10, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-22', name: 'S. Hasan', age: 30, nationality: 'Pakistan', role: 'BT', batting: 65, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-23', name: 'Zakir', age: 23, nationality: 'Pakistan', role: 'BT', batting: 59, bowling: 11, style: 'D', isForeign: false, pos: 'Finisher' },
    { id: 'bt-24', name: 'Sadiq', age: 24, nationality: 'Pakistan', role: 'BT', batting: 46, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-25', name: 'A. Jamal', age: 29, nationality: 'Pakistan', role: 'BT', batting: 59, bowling: 0, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-26', name: 'Ashfaq', age: 22, nationality: 'Pakistan', role: 'BT', batting: 55, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-27', name: 'Farhan', age: 26, nationality: 'Pakistan', role: 'BT', batting: 78, bowling: 10, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-28', name: 'M. Musa', age: 21, nationality: 'Pakistan', role: 'BT', batting: 72, bowling: 8, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-29', name: 'Abass', age: 27, nationality: 'Pakistan', role: 'BT', batting: 72, bowling: 0, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-30', name: 'Faisal Hasan', age: 27, nationality: 'Pakistan', role: 'BT', batting: 83, bowling: 60, style: 'NA', isForeign: false, pos: 'Finisher' },
    { id: 'bt-31', name: 'Muhammad Shahzain', age: 23, nationality: 'Pakistan', role: 'BT', batting: 70, bowling: 34, style: 'N', isForeign: false, pos: 'Finisher' },
    { id: 'bt-32', name: 'Azhar', age: 34, nationality: 'Pakistan', role: 'BT', batting: 75, bowling: 45, style: 'A', isForeign: false },
];

export const getAllExtraPlayers = (): Player[] => {
    return [
        ...parseRawData(RAW_DATA_INTERNATIONAL),
        ...parseRawData(RAW_INTERNATIONAL_ALL),
        ...parseRawData(RAW_DATA_SPINNERS),
        ...parseRawData(RAW_DATA_ALLROUNDERS),
        ...parseRawData(RAW_DATA_WK),
        ...parseRawData(RAW_DATA_FAST),
        ...parseRawData(RAW_DATA_BT)
    ];
};

export const getAutomatedWeakness = (player: Player): BowlingSubType[] => {
    if (player.weaknesses && player.weaknesses.length > 0) return player.weaknesses;
    if (player.battingSkill <= 40) return []; 
    
    const pools: BowlingSubType[] = ['ls', 'os', 'lals', 'laos', 'lac', 'fb', 'fbs', 'm', 'mv'];
    let weights = pools.map(() => 1);
    
    if (player.style === 'A' || player.style === 'NA') {
        ['ls', 'lac', 'fb'].forEach(s => {
            const idx = pools.indexOf(s as BowlingSubType);
            if (idx !== -1) weights[idx] += 3;
        });
    } else if (player.style === 'D') {
        ['fbs', 'mv', 'os'].forEach(s => {
            const idx = pools.indexOf(s as BowlingSubType);
            if (idx !== -1) weights[idx] += 3;
        });
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const pickOne = (): BowlingSubType => {
        let r = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return pools[i];
        }
        return pools[0];
    };

    if (player.battingSkill > 70) {
        return [pickOne()];
    }
    return [];
};

export const initializePlayersWithWeaknesses = (players: Player[]): Player[] => {
    return players.map(p => ({
        ...p,
        weaknesses: getAutomatedWeakness(p)
    }));
};
