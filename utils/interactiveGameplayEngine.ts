import { Player, Format, PendingBowlerDelivery, LastShotFeedback, LiveTacticalInput } from '../types';
import { FIELD_PRESETS, FielderPosition } from '../data/fieldingPresets';

/**
 * Calculates delivery specifications for the upcoming ball
 */
export const generatePendingBowlerDelivery = (
    bowler: Player,
    striker: Player,
    format: Format,
    situation: { isPowerplay: boolean; isDeath: boolean; requiredRR?: number; currentPartnership?: number }
): PendingBowlerDelivery => {
    const isSpinner = bowler.role === 'SB' || 
                      bowler.bowlingSubType?.toLowerCase().includes('spin') || 
                      bowler.role?.toLowerCase().includes('spin');

    const bowlingSkill = bowler.secondarySkill || 75;
    const weaknesses = striker.weaknesses || [];
    const exploitsWeakness = weaknesses.length > 0 && Math.random() < 0.55;

    let length: 'yorker' | 'full' | 'good' | 'short' = 'good';
    let line: 'off' | 'middle' | 'leg' = 'off';
    let variation = 'Standard Delivery';
    let speed = 135;

    if (isSpinner) {
        speed = Math.round((84 + (bowlingSkill / 100) * 12 + (Math.random() * 6 - 3)) * 10) / 10;
        const spinVariations = ['Leg Break & Turn', 'Googly / Wrong-Un', 'Arm Ball (Straight)', 'Flighted Top Spinner', 'Drifting Slider', 'Quicker Fired-In'];
        variation = spinVariations[Math.floor(Math.random() * spinVariations.length)];
        
        if (exploitsWeakness) {
            length = 'good';
            line = 'off';
        } else if (situation.isDeath) {
            length = Math.random() > 0.4 ? 'full' : 'good';
            line = Math.random() > 0.5 ? 'middle' : 'off';
        } else {
            const rand = Math.random();
            if (rand < 0.4) length = 'good';
            else if (rand < 0.75) length = 'full';
            else length = 'short';
            line = Math.random() > 0.6 ? 'off' : Math.random() > 0.3 ? 'middle' : 'leg';
        }
    } else {
        // Fast / Medium Pace
        const isExpressPacer = bowlingSkill > 85;
        speed = Math.round((isExpressPacer ? 142 : 132) + (Math.random() * 12 - 4));

        if (exploitsWeakness && weaknesses.some(w => w.toLowerCase().includes('short') || w.toLowerCase().includes('bounce'))) {
            length = 'short';
            line = Math.random() > 0.5 ? 'middle' : 'leg';
            variation = 'Bouncer at the Ribs';
        } else if (situation.isDeath) {
            if (Math.random() < 0.55) {
                length = 'yorker';
                line = Math.random() > 0.5 ? 'middle' : 'off';
                variation = 'Toe-Crushing Yorker';
            } else if (Math.random() < 0.8) {
                length = 'short';
                line = 'off';
                variation = 'Slower Ball Bouncer';
                speed -= 22;
            } else {
                length = 'good';
                line = 'off';
                variation = 'Wide Off-Cutter';
                speed -= 18;
            }
        } else if (situation.isPowerplay) {
            if (Math.random() < 0.5) {
                length = 'good';
                line = 'off';
                variation = 'Outswinger in the Channel';
            } else if (Math.random() < 0.8) {
                length = 'full';
                line = 'off';
                variation = 'Late Inswinger';
            } else {
                length = 'short';
                line = 'middle';
                variation = 'Hurried Bouncer';
            }
        } else {
            const r = Math.random();
            if (r < 0.45) {
                length = 'good';
                line = 'off';
                variation = 'Seam Movement off Deck';
            } else if (r < 0.75) {
                length = 'full';
                line = Math.random() > 0.5 ? 'off' : 'middle';
                variation = 'Full Pitch Inswinger';
            } else if (r < 0.9) {
                length = 'short';
                line = 'leg';
                variation = 'Bouncer / Short Pitch';
            } else {
                length = 'yorker';
                line = 'middle';
                variation = 'Fast Yorker';
            }
        }
    }

    // Coordinates for pitch visual overlay (SVG coordinate system 400x400)
    let targetX = 200;
    if (line === 'off') targetX = 206;
    else if (line === 'leg') targetX = 194;

    let targetY = 195;
    if (length === 'yorker') targetY = 222;
    else if (length === 'full') targetY = 208;
    else if (length === 'good') targetY = 194;
    else if (length === 'short') targetY = 176;

    // Recommendations and risk analysis
    let recommendedShots: string[] = [];
    let riskShots: string[] = [];
    let description = '';

    if (length === 'yorker') {
        description = `${speed} km/h • ${variation} in the blockhole on ${line} stump!`;
        recommendedShots = ['Defensive Block', 'Dig Out', 'Straight Push', 'Flick'];
        riskShots = ['Lofted Drive', 'Cross-bat Pull', 'Reverse Sweep'];
    } else if (length === 'short') {
        description = `${speed} km/h • ${variation} rising sharply on ${line} line!`;
        recommendedShots = ['Pull Shot', 'Hook', 'Upper Cut', 'Duck / Evade'];
        riskShots = ['Frontfoot Cover Drive', 'Straight Drive', 'Frontfoot Sweep'];
    } else if (length === 'full') {
        description = `${speed} km/h • ${variation} pitched up invitingly outside ${line}!`;
        recommendedShots = ['Cover Drive', 'On Drive', 'Straight Drive', 'Lofted Over Mid-Off'];
        riskShots = ['Backfoot Pull', 'Square Cut', 'Late Dab'];
    } else {
        // Good Length
        description = `${speed} km/h • ${variation} on testing good length in corridor (${line})!`;
        recommendedShots = ['Forward Defense', 'Square Cut', 'Backfoot Punch', 'Soft Hands Push'];
        riskShots = ['Wild Cross-bat Slog', 'Stepping Out Heave'];
    }

    return {
        bowlerName: bowler.name,
        speedKmh: speed,
        length,
        line,
        speed,
        variation,
        description,
        recommendedShots,
        riskShots,
        targetX,
        targetY
    };
};

/**
 * Calculates the exact angle from batsman (200, 225) to a fielder coordinate (x, y)
 */
export const getFielderAngle = (fielder: FielderPosition): number => {
    const dx = fielder.x - 200;
    const dy = fielder.y - 225;
    let deg = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360);
    return deg;
};

/**
 * Finds the optimal counter-shot, gap angle, and ground/lofted execution against any delivery
 */
export const findOptimalCounterShot = (
    delivery: PendingBowlerDelivery,
    fieldPresetId?: string
): {
    aimedShotAngle: number;
    selectedShotType: string;
    shotCategory: 'Placement' | 'Attacking' | 'Lofted' | 'Defensive';
    isLofted: boolean;
    reasoning: string;
    targetGapDegrees: number;
} => {
    const activePreset = FIELD_PRESETS.find(p => p.id === fieldPresetId) || FIELD_PRESETS[0];
    const fielders = activePreset.fielders;

    interface Candidate {
        shotName: string;
        baseAngle: number;
        category: 'Placement' | 'Attacking' | 'Lofted' | 'Defensive';
        allowedLoft: boolean;
    }

    let candidates: Candidate[] = [];

    if (delivery.length === 'short') {
        if (delivery.line === 'leg' || delivery.line === 'middle') {
            candidates = [
                { shotName: 'Pull Shot', baseAngle: 125, category: 'Attacking', allowedLoft: false },
                { shotName: 'Hook Shot', baseAngle: 105, category: 'Attacking', allowedLoft: true },
                { shotName: 'Fine Leg Glance', baseAngle: 60, category: 'Placement', allowedLoft: false },
                { shotName: 'Duck / Evade', baseAngle: 90, category: 'Defensive', allowedLoft: false }
            ];
        } else {
            candidates = [
                { shotName: 'Upper Cut', baseAngle: 220, category: 'Placement', allowedLoft: false },
                { shotName: 'Square Cut', baseAngle: 270, category: 'Placement', allowedLoft: false },
                { shotName: 'Third Man Ramp', baseAngle: 200, category: 'Placement', allowedLoft: true }
            ];
        }
    } else if (delivery.length === 'yorker') {
        // Yorkers must NEVER be lofted (high risk of bowled/LBW)
        if (delivery.line === 'off') {
            candidates = [
                { shotName: 'Dig Out / Push', baseAngle: 0, category: 'Placement', allowedLoft: false },
                { shotName: 'Cover Drive (Ground)', baseAngle: 315, category: 'Placement', allowedLoft: false },
                { shotName: 'Forward Defense', baseAngle: 330, category: 'Defensive', allowedLoft: false }
            ];
        } else if (delivery.line === 'leg') {
            candidates = [
                { shotName: 'Flick Shot', baseAngle: 45, category: 'Placement', allowedLoft: false },
                { shotName: 'On Drive', baseAngle: 340, category: 'Placement', allowedLoft: false },
                { shotName: 'Defensive Block', baseAngle: 10, category: 'Defensive', allowedLoft: false }
            ];
        } else {
            candidates = [
                { shotName: 'Straight Push', baseAngle: 0, category: 'Placement', allowedLoft: false },
                { shotName: 'On Drive', baseAngle: 340, category: 'Placement', allowedLoft: false },
                { shotName: 'Solid Block', baseAngle: 15, category: 'Defensive', allowedLoft: false }
            ];
        }
    } else if (delivery.length === 'full') {
        if (delivery.line === 'off') {
            candidates = [
                { shotName: 'Cover Drive', baseAngle: 315, category: 'Placement', allowedLoft: false },
                { shotName: 'Extra Cover Loft', baseAngle: 300, category: 'Lofted', allowedLoft: true },
                { shotName: 'Straight Drive', baseAngle: 0, category: 'Placement', allowedLoft: false }
            ];
        } else if (delivery.line === 'leg') {
            candidates = [
                { shotName: 'Flick Shot', baseAngle: 45, category: 'Placement', allowedLoft: false },
                { shotName: 'Mid-Wicket Punch', baseAngle: 75, category: 'Attacking', allowedLoft: false },
                { shotName: 'On Drive', baseAngle: 340, category: 'Placement', allowedLoft: false }
            ];
        } else {
            candidates = [
                { shotName: 'Straight Drive', baseAngle: 0, category: 'Placement', allowedLoft: false },
                { shotName: 'Lofted Over Long Off', baseAngle: 10, category: 'Lofted', allowedLoft: true },
                { shotName: 'On Drive', baseAngle: 340, category: 'Placement', allowedLoft: false }
            ];
        }
    } else {
        // Good Length (Corridor)
        if (delivery.line === 'off') {
            candidates = [
                { shotName: 'Square Cut', baseAngle: 270, category: 'Placement', allowedLoft: false },
                { shotName: 'Backfoot Punch', baseAngle: 295, category: 'Placement', allowedLoft: false },
                { shotName: 'Forward Defense', baseAngle: 330, category: 'Defensive', allowedLoft: false }
            ];
        } else if (delivery.line === 'leg') {
            candidates = [
                { shotName: 'Nudge to Mid-Wicket', baseAngle: 60, category: 'Placement', allowedLoft: false },
                { shotName: 'On Drive', baseAngle: 340, category: 'Placement', allowedLoft: false },
                { shotName: 'Defensive Glance', baseAngle: 85, category: 'Defensive', allowedLoft: false }
            ];
        } else {
            candidates = [
                { shotName: 'Backfoot Punch', baseAngle: 350, category: 'Placement', allowedLoft: false },
                { shotName: 'Straight Drive', baseAngle: 0, category: 'Placement', allowedLoft: false },
                { shotName: 'Forward Defense', baseAngle: 15, category: 'Defensive', allowedLoft: false }
            ];
        }
    }

    let bestCandidate = candidates[0];
    let bestAngle = bestCandidate.baseAngle;
    let maxGapDegrees = -1;

    for (const cand of candidates) {
        // Test angle variations around the base angle (+- 24 deg in 3 deg steps)
        for (let offset = -24; offset <= 24; offset += 3) {
            let testAngle = (cand.baseAngle + offset + 360) % 360;
            
            // Find distance to closest fielder
            let minDiff = 360;
            let closestFielder: FielderPosition = fielders[0];
            for (const f of fielders) {
                const fAngle = getFielderAngle(f);
                let diff = Math.abs(testAngle - fAngle);
                if (diff > 180) diff = 360 - diff;
                if (diff < minDiff) {
                    minDiff = diff;
                    closestFielder = f;
                }
            }

            // If this candidate is lofted, penalize if the closest fielder is a deep fielder within 28 degrees
            let effectiveGap = minDiff;
            if (cand.allowedLoft && closestFielder.isDeep && minDiff < 28) {
                effectiveGap -= 15;
            }

            if (effectiveGap > maxGapDegrees) {
                maxGapDegrees = effectiveGap;
                bestAngle = testAngle;
                bestCandidate = cand;
            }
        }
    }

    const isLofted = bestCandidate.allowedLoft && maxGapDegrees >= 24;
    const shotCat = isLofted ? 'Lofted' : bestCandidate.category;

    const reasoning = `Countered ${delivery.length.toUpperCase()} (${delivery.line}) with ${bestCandidate.shotName} into open gap (${Math.round(maxGapDegrees)}° clearance).`;

    return {
        aimedShotAngle: bestAngle,
        selectedShotType: bestCandidate.shotName,
        shotCategory: shotCat,
        isLofted,
        reasoning,
        targetGapDegrees: Math.round(maxGapDegrees)
    };
};

/**
 * Evaluates the physics, placement, and consequence of a user's tactical shot choice
 */
export const resolveTacticalShotOutcome = (params: {
    tacticalInput: LiveTacticalInput;
    pendingDelivery: PendingBowlerDelivery;
    striker: Player;
    bowler: Player;
    fieldPresetId?: string;
    format: Format;
    situation?: { isPowerplay?: boolean; isDeath?: boolean };
}): {
    runs: number;
    isOut: boolean;
    dismissalText?: string;
    dismissalType?: string;
    commentary: string;
    feedback: LastShotFeedback;
    quality: 'Perfect Timing' | 'Well Placed' | 'Good Connection' | 'Edged' | 'Beaten' | 'Trapped';
} => {
    const { tacticalInput, pendingDelivery, striker, bowler, fieldPresetId } = params;
    const shotAngle = tacticalInput.shotAngle !== undefined ? tacticalInput.shotAngle : 315;
    const shotType = tacticalInput.shotType || 'Drive';
    const isLofted = !!tacticalInput.isLofted;
    const shotCategory = tacticalInput.shotCategory || 'Attacking';

    const activePreset = FIELD_PRESETS.find(p => p.id === fieldPresetId) || FIELD_PRESETS[1]; // default powerplay attacking
    const fielders = activePreset.fielders;

    // Find the closest fielder to the aimed shot angle
    let closestFielder: FielderPosition = fielders[0];
    let minAngleDiff = 360;

    fielders.forEach(f => {
        const fAngle = getFielderAngle(f);
        let diff = Math.abs(shotAngle - fAngle);
        if (diff > 180) diff = 360 - diff;
        if (diff < minAngleDiff) {
            minAngleDiff = diff;
            closestFielder = f;
        }
    });

    const batterSkill = striker.battingSkill || 75;
    const bowlerSkill = bowler.secondarySkill || 75;
    const skillAdvantage = (batterSkill - bowlerSkill) / 100; // e.g. -0.15 to +0.25

    // Check shot compatibility with the incoming delivery
    const shotUpper = shotType.toUpperCase();
    let isShotCompatible = false;
    let isShotFatal = false;

    if (pendingDelivery.length === 'yorker') {
        if (shotCategory === 'Defensive' || shotCategory === 'Placement' || shotUpper.includes('BLOCK') || shotUpper.includes('DIG') || shotUpper.includes('FLICK') || shotUpper.includes('DEFENSE')) {
            isShotCompatible = true;
        } else if (isLofted || shotUpper.includes('PULL') || shotUpper.includes('SWEEP') || shotUpper.includes('SLOG')) {
            isShotFatal = true;
        }
    } else if (pendingDelivery.length === 'short') {
        if (shotUpper.includes('PULL') || shotUpper.includes('HOOK') || shotUpper.includes('CUT') || shotUpper.includes('UPPER') || shotUpper.includes('DUCK') || shotCategory === 'Defensive') {
            isShotCompatible = true;
        } else if (shotUpper.includes('DRIVE') || shotUpper.includes('SWEEP') || shotUpper.includes('FORWARD')) {
            isShotFatal = true;
        }
    } else if (pendingDelivery.length === 'full') {
        if (shotUpper.includes('DRIVE') || shotUpper.includes('FLICK') || shotUpper.includes('LOFT') || shotUpper.includes('STRAIGHT') || shotUpper.includes('COVER')) {
            isShotCompatible = true;
        } else if (shotUpper.includes('PULL') || shotUpper.includes('CUT')) {
            isShotFatal = true;
        }
    } else {
        // Good Length
        if (shotCategory === 'Defensive' || shotUpper.includes('PUNCH') || shotUpper.includes('CUT') || shotUpper.includes('PUSH') || shotUpper.includes('DEFENSE')) {
            isShotCompatible = true;
        } else if (isLofted && (shotUpper.includes('SLOG') || shotUpper.includes('HEAVE'))) {
            isShotFatal = true;
        } else {
            isShotCompatible = true; // neutral
        }
    }

    // --- FATAL INCOMPATIBILITY (Wrong shot for the delivery) ---
    if (isShotFatal && Math.random() < 0.75 - skillAdvantage * 0.3) {
        if (pendingDelivery.length === 'yorker') {
            // Bowled or LBW
            const isBowled = Math.random() < 0.7;
            return {
                runs: 0,
                isOut: true,
                dismissalType: isBowled ? 'bowled' : 'lbw',
                dismissalText: isBowled ? `b ${bowler.name}` : `lbw b ${bowler.name}`,
                commentary: isBowled 
                    ? `🎯 CLEAN BOWLED! ${bowler.name} shatters the stumps with a lethal yorker as ${striker.name} played across the line!` 
                    : `💥 LBW APPEAL & GIVEN! Crashing into the toe-crusher right in front of middle stump!`,
                feedback: {
                    type: isBowled ? 'bowled' : 'lbw',
                    title: isBowled ? 'CLEAN BOWLED!' : 'TRAPPED LBW!',
                    message: `Fatal error: Attempted ${shotType} against a pinpoint ${pendingDelivery.speed} km/h Yorker!`,
                    runs: 0,
                    isOut: true
                },
                quality: 'Trapped'
            };
        }

        if (pendingDelivery.length === 'short') {
            // Top Edge miscue or beaten
            const isCaught = Math.random() < 0.65;
            if (isCaught) {
                return {
                    runs: 0,
                    isOut: true,
                    dismissalType: 'caught',
                    dismissalText: `c ${closestFielder.name} b ${bowler.name}`,
                    commentary: `💥 TOP EDGE AND CAUGHT! ${striker.name} tried to drive a fiery ${pendingDelivery.speed} km/h bouncer, ballooned high in the air to ${closestFielder.label}!`,
                    feedback: {
                        type: 'top_edge',
                        title: 'TOP EDGE MISCUE (OUT)',
                        message: `Mistake: Driving against a bouncer resulted in a top edge to ${closestFielder.label}!`,
                        closestFielderName: closestFielder.label,
                        runs: 0,
                        isOut: true
                    },
                    quality: 'Edged'
                };
            } else {
                return {
                    runs: 0,
                    isOut: false,
                    commentary: `🧤 BEATEN! ${striker.name} flashes at a nasty short ball and misses completely. Through to the keeper!`,
                    feedback: {
                        type: 'play_and_miss',
                        title: 'PLAY & MISS (BEATEN)',
                        message: `Beaten for pace & bounce on the bouncer. Lucky not to feather an edge.`,
                        runs: 0,
                        isOut: false
                    },
                    quality: 'Beaten'
                };
            }
        }

        // Outside edge
        const edgeCaught = Math.random() < 0.6;
        if (edgeCaught) {
            return {
                runs: 0,
                isOut: true,
                dismissalType: 'caught',
                dismissalText: `c Keeper b ${bowler.name}`,
                commentary: `🧤 EDGED AND TAKEN! Thick outside edge off ${striker.name}'s bat straight into the keeper's gloves!`,
                feedback: {
                    type: 'edge_caught',
                    title: 'OUTSIDE EDGE CAUGHT!',
                    message: `Mistimed shot outside off stump carried straight to the keeper!`,
                    runs: 0,
                    isOut: true
                },
                quality: 'Edged'
            };
        } else {
            return {
                runs: 1,
                isOut: false,
                commentary: `🏏 Thick outside edge flies safely past slips down towards third man for a single.`,
                feedback: {
                    type: 'edge_safe',
                    title: 'OUTSIDE EDGE (SAFE SINGLE)',
                    message: `Thick edge squirted past the slips cordon into third man.`,
                    runs: 1,
                    isOut: false
                },
                quality: 'Edged'
            };
        }
    }

    // --- GAP AND FIELDER TRAJECTORY CALCULATION ---
    const isDirectlyAtFielder = minAngleDiff < 14;
    const isInBetweenGap = minAngleDiff >= 14;

    // If hit directly at a fielder
    if (isDirectlyAtFielder) {
        if (isLofted) {
            // Caught out in the air!
            return {
                runs: 0,
                isOut: true,
                dismissalType: 'caught',
                dismissalText: `c ${closestFielder.name} b ${bowler.name}`,
                commentary: `💥 IN THE AIR AND CAUGHT! ${striker.name} went aerial but picked out ${closestFielder.label} at ${closestFielder.side} side!`,
                feedback: {
                    type: 'edge_caught',
                    title: `CAUGHT AT ${closestFielder.label.toUpperCase()}`,
                    message: `Shot was aimed directly at ${closestFielder.label} (${Math.round(minAngleDiff)}° margin)!`,
                    closestFielderName: closestFielder.label,
                    angleDiff: Math.round(minAngleDiff),
                    runs: 0,
                    isOut: true
                },
                quality: 'Trapped'
            };
        } else {
            // Ground shot stopped by fielder
            if (closestFielder.isDeep) {
                return {
                    runs: 1,
                    isOut: false,
                    commentary: `🎯 Cleanly fielded in the deep by ${closestFielder.label}. Swept up quickly, keeping it to just 1 run.`,
                    feedback: {
                        type: 'single_fielded',
                        title: `FIELDED IN DEEP (${closestFielder.label})`,
                        message: `Fielded on the bounce in deep. Safe single taken.`,
                        closestFielderName: closestFielder.label,
                        angleDiff: Math.round(minAngleDiff),
                        runs: 1,
                        isOut: false
                    },
                    quality: 'Good Connection'
                };
            } else {
                return {
                    runs: 0,
                    isOut: false,
                    commentary: `🛑 STRAIGHT TO THE FIELDER! Brilliant stop by ${closestFielder.label} in the ring - dot ball!`,
                    feedback: {
                        type: 'dot_fielded',
                        title: `INTERCEPTED BY ${closestFielder.label.toUpperCase()}`,
                        message: `Hit straight into the hands of ${closestFielder.label}. No run.`,
                        closestFielderName: closestFielder.label,
                        angleDiff: Math.round(minAngleDiff),
                        runs: 0,
                        isOut: false
                    },
                    quality: 'Well Placed'
                };
            }
        }
    }

    // --- SHOT AIMED INTO THE GAP (Success!) ---
    if (isInBetweenGap) {
        if (isLofted) {
            // Clean lofted boundary or Six!
            const isSix = Math.random() < 0.65 + skillAdvantage * 0.3;
            const runs = isSix ? 6 : 4;
            return {
                runs,
                isOut: false,
                commentary: isSix 
                    ? `🚀 MAXIMUM! ${striker.name} launches ${shotType} into the open sky! Sails high over the boundary for SIX!` 
                    : `💥 CRACKING HIT! One bounce over the ropes into the vacant pocket for FOUR!`,
                feedback: {
                    type: 'clean_loft',
                    title: isSix ? '6 RUNS! MASSIVE SIX' : '4 RUNS! LOFTED BOUNDARY',
                    message: `Aimed into open gap (${Math.round(minAngleDiff)}° from nearest fielder ${closestFielder.label})!`,
                    closestFielderName: closestFielder.label,
                    angleDiff: Math.round(minAngleDiff),
                    runs,
                    isOut: false
                },
                quality: 'Perfect Timing'
            };
        } else {
            // Ground drive piercing the gap
            const runs = minAngleDiff > 22 ? 4 : (Math.random() < 0.6 ? 4 : 2);
            return {
                runs,
                isOut: false,
                commentary: runs === 4 
                    ? `⚡ BEAUTIFULLY PIERCED! ${striker.name} times the ${shotType} between the fielders - races away for FOUR!`
                    : `🏃 Placed neatly into the gap! Good running between the wickets for a brace of runs.`,
                feedback: {
                    type: 'perfect_gap',
                    title: runs === 4 ? '4 RUNS! PIERCED GAP' : '2 RUNS! PLACED IN GAP',
                    message: `Splendid gap placement between fielders (${Math.round(minAngleDiff)}° clearance)!`,
                    closestFielderName: closestFielder.label,
                    angleDiff: Math.round(minAngleDiff),
                    runs,
                    isOut: false
                },
                quality: runs === 4 ? 'Perfect Timing' : 'Well Placed'
            };
        }
    }

    // Fallback safe single
    return {
        runs: 1,
        isOut: false,
        commentary: `${striker.name} nudges the ball into space and rotates the strike.`,
        feedback: {
            type: 'single_fielded',
            title: '1 RUN (ROTATED STRIKE)',
            message: 'Comfortable single taken into open field.',
            runs: 1,
            isOut: false
        },
        quality: 'Good Connection'
    };
};
