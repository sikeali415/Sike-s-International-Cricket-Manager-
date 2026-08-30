export interface CommentaryContext {
    batsman?: string;
    bowler?: string;
    team?: string;
    runs?: number;
    balls?: number;
    rate?: string | number;
    remaining_runs?: number;
    remaining_balls?: number;
    partnership_runs?: number;
    partnership_balls?: number;
    wickets_down?: number;
    overs_left?: number | string;
    // New fields for toss, line-reader, mid-innings, match end, and tactical advice
    winner?: string;
    loser?: string;
    decision?: string;
    battingSkill?: number;
    bowlingSkill?: number;
    battingTeam?: string;
    bowlingTeam?: string;
    score?: number;
    wickets?: number;
    target?: number;
    overs?: number | string;
    resultText?: string;
    potmName?: string;
    topBatterName?: string;
    topBatterRuns?: number;
    topBatterBalls?: number;
    topBowlerName?: string;
    topBowlerWickets?: number;
    topBowlerRuns?: number;
    suggestedBatter?: string;
    otherBatter?: string;
}

export const EXPANDED_COMMENTARY_BANK = {
  toss: [
    "Toss won by {winner} against {loser} and elected to {decision} first!",
    "The coin spins in favor of {winner} against {loser}! Captain steps up and elects to {decision} first.",
    "Coin toss goes to {winner} vs {loser}. {winner} choose to {decision} first on this track!",
    "{winner} win the toss against {loser} and have no hesitation in deciding to {decision} first."
  ],
  line_reader: {
    opener_batsman: [
      "{batsman} (Batting Skill: {battingSkill}) takes guard to open the innings! Has scored {runs} runs this season.",
      "All eyes on opener {batsman}! Carrying a skill rating of {battingSkill}, looking to set the pace early.",
      "{batsman} steps out to open the batting for {team}. A crucial player with a rating of {battingSkill}!"
    ],
    opener_bowler: [
      "Opening the attack for {team} is {bowler} (Bowling Skill: {bowlingSkill})! Looking for early movement.",
      "{bowler} takes the new ball! With a bowling rating of {bowlingSkill}, the opposition openers will need to be alert.",
      "First over of the match will be bowled by {bowler}. A formidable bowler with {bowlingSkill} skill rating!"
    ]
  },
  mid_innings: {
    high_target: [
      "INNINGS BREAK! {battingTeam} post a massive {score}/{wickets}. Target for {bowlingTeam} is {target} runs in {overs} overs ({rate} RRR). This is a steep mountain to climb!",
      "DAUNTING TARGET! {battingTeam} set {target} runs. {bowlingTeam} will need explosive firepower from ball one to chase this down!",
      "HIGH-PRESSURE CHASE! {battingTeam} finish on {score}/{wickets}. {bowlingTeam} require {target} at an asking rate of {rate} runs per over."
    ],
    moderate_target: [
      "INNINGS BREAK! {battingTeam} finish on {score}/{wickets}. Target for {bowlingTeam} is {target} ({rate} RRR). A finely balanced contest ahead!",
      "COMPETITIVE TOTAL! {battingTeam} set {target} runs. Both teams will feel they are right in this game!",
      "INTERMISSION! {bowlingTeam} need {target} runs from {overs} overs. Solid discipline required from both sides."
    ],
    low_target: [
      "INNINGS BREAK! Superb bowling by {bowlingTeam} restricts {battingTeam} to {score}/{wickets}. Target is {target} runs ({rate} RRR).",
      "LOW-SCORE DEFENSE NEEDED! {battingTeam} posted {score}. {bowlingTeam} require {target} for victory — looks like a manageable chase!",
      "CONTROLLED BOWLING! {bowlingTeam} hold {battingTeam} to {score}. Target: {target}. {bowlingTeam} hold the upper hand!"
    ]
  },
  end_of_match: {
    summary: [
      "MATCH COMPLETED! {resultText}. Player of the Match: {potmName} for a match-winning display!",
      "WHAT A FINISH! {resultText}. {potmName} earns the Player of the Match award for an outstanding all-round effort!",
      "FULL TIME! {resultText}. A stellar performance from {potmName} earns him the Player of the Match honors!"
    ],
    scorecard_breakdown: [
      "SCORECARD HIGHLIGHTS: {topBatterName} anchored the batting with {topBatterRuns} runs off {topBatterBalls} balls, while {topBowlerName} led the bowling attack with {topBowlerWickets} wickets for {topBowlerRuns} runs!",
      "KEY PERFORMERS: Top batsman {topBatterName} ({topBatterRuns} off {topBatterBalls}) and top bowler {topBowlerName} ({topBowlerWickets}/{topBowlerRuns}) delivered the big moments in this match!"
    ]
  },
  tactical_advice: {
    accelerate: [
      "TACTICAL INSIGHT: Required run rate has climbed to {rate}! The dugout should consider sending {suggestedBatter} next instead of {otherBatter} to get quick boundaries!",
      "STRATEGY NOTE: {team} need to put a big total here! Promoting {suggestedBatter} over {otherBatter} could inject massive firepower into the middle overs.",
      "DUGOUT ANALYSIS: With the run rate climbing, sending {suggestedBatter} ahead of {otherBatter} could be the game-changer {team} desperately needs!"
    ],
    stabilize: [
      "TACTICAL INSIGHT: With {wickets_down} wickets down and required rate at {rate}, sending a steady anchor like {suggestedBatter} next instead of {otherBatter} will stabilize the chase!",
      "STRATEGY NOTE: The collapse is threatening {team}. Promoting {suggestedBatter} over {otherBatter} provides much-needed composure in the middle."
    ]
  },
  milestones: {
    fifty: [
      "{batsman} brings up his fifty! A well-crafted innings so far.",
      "FIFTY for {batsman}! He raises the bat to a good round of applause.",
      "{batsman} into the fifties now - {balls} balls, patient and controlled.",
      "That's a half-century for {batsman}, exactly what his team needed.",
      "{batsman} reaches fifty with a nudge into the gap - calm celebration, more work to do.",
      "Fifty up for {batsman}! The innings is really taking shape.",
      "A gritty half-century from {batsman}, fighting through some testing bowling.",
      "{batsman} gets to fifty in style, timing it beautifully through the covers.",
      "Half-century for {batsman} - he's starting to look every inch the player he can be.",
      "{batsman} raises his bat for fifty, and you sense there's more to come.",
      "That's fifty for {batsman} off just {balls} deliveries - real intent on show.",
      "Milestone reached - {batsman} moves to fifty, quietly getting the job done.",
      "{batsman}'s fifty comes up almost unnoticed, such has been the control.",
      "Fifty for {batsman}, and the celebration says he knows how much this innings matters."
    ],
    hundred: [
      "A magnificent HUNDRED for {batsman}! He punches the air in delight.",
      "{batsman} reaches three figures! What an innings this has been.",
      "Century for {batsman} - the bat is raised high, helmet off, pure joy.",
      "That's a hundred for {batsman}! Off {balls} balls, an innings to remember.",
      "{batsman} into triple figures, and the dugout is on its feet.",
      "HUNDRED! {batsman} has done it again, a captain's innings when it mattered most.",
      "{batsman} completes a superb century, controlled from ball one.",
      "A special hundred for {batsman} - this one will be talked about for a while.",
      "Three figures for {batsman}! He kisses the badge and points to the sky.",
      "{batsman} gets his hundred with a thumping boundary - fitting finish to the milestone.",
      "That's a ton for {batsman}, and he looks nowhere near done yet.",
      "Century of the highest quality from {batsman} - class through and through.",
      "{batsman} raises the bat for a hundred - relief and pride all at once.",
      "A hundred against the odds for {batsman}, battling tough conditions all innings."
    ],
    fifer: [
      "{bowler} completes his FIFER! Five wickets in the bag, a superb spell.",
      "That's five for {bowler}! An outstanding piece of bowling.",
      "{bowler} picks up his fifth wicket - a fifer to remember.",
      "Five-wicket haul for {bowler}! He's ripped through this batting order.",
      "{bowler} claims his fifth of the innings - the crowd rises for him.",
      "A fifer for {bowler}, and deservedly so after that display of skill.",
      "Five down to {bowler}! This has been a masterclass in bowling.",
      "{bowler} completes his five-for with a peach of a delivery.",
      "That's five wickets for {bowler} - simply too good today.",
      "{bowler} takes his fifth scalp - a career-defining spell perhaps.",
      "Five wickets in the bag for {bowler}, and he's not done celebrating yet."
    ],
    consecutive_fifties: [
      "Another fifty for {batsman} - that's back-to-back half-centuries now!",
      "{batsman} continues his rich vein of form with a second straight fifty.",
      "That's consecutive fifties for {batsman} - he simply can't stop scoring.",
      "{batsman} makes it two fifties in a row - the runs keep flowing.",
      "Fifty again for {batsman}! He's in the form of his life right now.",
      "{batsman} extends his streak - another fifty to add to the collection.",
      "Back to back fifties for {batsman}, proof that his technique is rock solid.",
      "{batsman} just keeps delivering - yet another half-century in this run of form."
    ]
  },
  bowling: {
    first_wicket: [
      "And there's the breakthrough! {bowler} strikes with the first wicket of the match.",
      "First blood to {bowler}! The opening stand is finally broken.",
      "{bowler} draws first blood - exactly the start the bowling side wanted.",
      "The first wicket falls, and it's {bowler} who gets things moving.",
      "{bowler} needed that - the first wicket of the innings, and a huge one.",
      "That's the opening breakthrough for {bowler}! Just what the captain asked for.",
      "First wicket down, courtesy of {bowler} - the pressure is building already.",
      "{bowler} strikes early, and the game has suddenly shifted."
    ],
    good_spell: [
      "{bowler} is bowling beautifully here - tight lines, no room for the batters.",
      "What a spell this is from {bowler} - relentless and disciplined.",
      "{bowler} has found his rhythm, and the batters are struggling to cope.",
      "This is top-class bowling from {bowler} - every ball with a purpose.",
      "{bowler} is in complete control of this spell - hardly a bad ball in sight.",
      "The pressure {bowler} is building right now is immense.",
      "{bowler} is making the batters play every single delivery - superb stuff.",
      "Not many boundaries against {bowler} today - a real squeeze on the scoring.",
      "{bowler} looks in the mood - every ball is asking a question.",
      "That's a maiden over from {bowler}! Excellent bowling under pressure."
    ],
    bad_spell: [
      "{bowler} is really struggling to find his line today - too many loose deliveries.",
      "That's a tough over for {bowler} - the batters are punishing anything short.",
      "{bowler} will want to forget this spell - runs leaking everywhere.",
      "The captain may need to have a word with {bowler} - the radar is off today.",
      "{bowler} just cannot find his rhythm, and it's costing runs in a hurry.",
      "Not the day {bowler} was hoping for - the batters have his measure right now.",
      "{bowler} is being taken apart here - a spell to forget quickly.",
      "Some poor areas from {bowler} - the batting side will be thrilled.",
      "{bowler} looks a little rattled after that over - the momentum has shifted.",
      "This has been an expensive spell for {bowler}, and the captain knows it."
    ]
  },
  boundaries: {
    consecutive_boundaries: [
      "Back-to-back boundaries for {batsman}! He's taking this bowler apart.",
      "Another boundary! That's two in a row for {batsman} now.",
      "{batsman} is finding the fence at will - consecutive boundaries here.",
      "Boundary after boundary from {batsman} - the bowler has no answers.",
      "{batsman} is in full flow - another one races to the fence!",
      "That's three boundaries in this over already, and {batsman} looks unstoppable.",
      "The bowler will be relieved this over is nearly done - {batsman} has taken it apart.",
      "{batsman} just keeps finding the gaps - boundary after boundary.",
      "This is carnage from {batsman} - the boundary count is climbing fast."
    ],
    single_four: [
      "FOUR! Beautifully timed by {batsman}, races away to the fence.",
      "{batsman} finds the gap perfectly - that's four more runs.",
      "Cracking shot from {batsman} - four all the way.",
      "{batsman} threads the needle through the field - boundary."
    ],
    single_six: [
      "SIX! {batsman} sends that one clean out of the ground.",
      "That's massive from {batsman} - over the ropes with ease.",
      "{batsman} picks the length early and launches it for six.",
      "Huge hit from {batsman} - the crowd loves that one."
    ]
  },
  form: {
    good_season: [
      "{batsman} is having the season of his life - runs just keep coming.",
      "What a purple patch this has been for {batsman} this season.",
      "{batsman} continues his dream season with another important contribution.",
      "This has been a standout season for {batsman}, and it shows out there.",
      "{bowler} has been the standout performer of the season with the ball.",
      "Another impressive display in what has been a brilliant season for {batsman}."
    ],
    bad_season: [
      "It has been a season to forget for {batsman}, and the struggle continues.",
      "{batsman} is really searching for form this season - nothing seems to click.",
      "A tough season for {batsman} continues, and the pressure is mounting.",
      "{bowler} has had a quiet season by his own high standards.",
      "{batsman} will want this season to end - the runs just haven't come.",
      "Another difficult outing for {batsman} in what's been a rough season overall."
    ]
  },
  match_situation: {
    remaining_target: [
      "{team} need {remaining_runs} runs from {remaining_balls} balls - a real contest brewing.",
      "It's {remaining_runs} needed off {remaining_balls} now - the game is finely poised.",
      "{team} require {remaining_runs} from the remaining {remaining_balls} deliveries.",
      "Down to {remaining_runs} needed from {remaining_balls} - every run matters now.",
      "The equation is simple for {team}: {remaining_runs} runs, {remaining_balls} balls left."
    ],
    required_run_rate_high: [
      "The required run rate has climbed to {rate} - {team} need to find boundaries fast.",
      "That required rate of {rate} is looking steep now - pressure building on the batters.",
      "{team} need a rate of {rate} an over from here - this is getting hard.",
      "The scoreboard pressure is real - a required rate of {rate} is no small ask.",
      "At {rate} an over required, {team} simply cannot afford many more dot balls."
    ],
    required_run_rate_low: [
      "Required rate is down to a comfortable {rate} - {team} in control of the chase.",
      "Just {rate} an over needed now - the pressure has eased for {team}.",
      "{team} cruising along, with only {rate} required per over from here.",
      "A required rate of {rate} looks very manageable at this stage."
    ],
    hard_to_win_wickets_down: [
      "This is looking incredibly difficult for {team} now - {wickets_down} wickets down and the required rate still climbing.",
      "With {wickets_down} wickets already gone, {team} are running out of batting to come.",
      "It's hard to see a way back for {team} - {wickets_down} down and the tail is exposed.",
      "{team} are in deep trouble here, {wickets_down} wickets down with plenty of work still to do.",
      "The required rate isn't the problem anymore - {team} simply have too few wickets left, {wickets_down} down already.",
      "This match is slipping away from {team} - {wickets_down} wickets down and the required rate rising fast."
    ],
    good_partnership: [
      "A brilliant partnership building here - {partnership_runs} runs added off {partnership_balls} balls.",
      "This stand is exactly what the innings needed - {partnership_runs} runs and counting.",
      "{partnership_runs} runs now for this partnership, and it's coming at a healthy pace.",
      "A crucial partnership worth {partnership_runs} runs is steadying the innings nicely.",
      "The two batters have added {partnership_runs} together - real control on show.",
      "That's a fifty partnership between these two - {partnership_runs} runs off {partnership_balls} balls."
    ],
    slow_batting_rate_rising: [
      "This is far too slow from {batsman} - the required rate keeps climbing with every dot ball.",
      "{batsman} needs to find some urgency here - the asking rate is creeping up fast.",
      "Too many dot balls from {batsman}, and the required rate is now a real concern.",
      "The scoring has completely dried up, and the required rate is ballooning as a result.",
      "{batsman} is playing far too cautiously for the situation - the rate keeps rising.",
      "This passage of play has been painfully slow, and it's put {team} well behind the rate.",
      "{batsman} will need to accelerate soon - every dot ball is hurting the chase now."
    ]
  }
};

const OPENERS = [
  "", "Well, ", "And ", "Look at that - ", "Would you believe it - ",
  "Right on cue, ", "Just like that, ", "Out of nowhere, "
];

const CLOSERS = [
  "", " Great scenes out there.", " The crowd is loving this.",
  " That's exactly the response needed.", " A moment to savour.",
  " You could sense that coming.", " No surprise there at all."
];

export function fillCommentaryTemplate(template: string, ctx: CommentaryContext): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (key in ctx && (ctx as any)[key] !== undefined) {
            return String((ctx as any)[key]);
        }
        return match;
    });
}

export function getRandomExpandedLine(lines: string[], ctx: CommentaryContext): string {
    if (!lines || lines.length === 0) return "";
    const baseLine = lines[Math.floor(Math.random() * lines.length)];
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    const closer = CLOSERS[Math.floor(Math.random() * CLOSERS.length)];
    
    let combined = `${opener}${baseLine}${closer}`.trim().replace(/\s+/g, ' ');
    return fillCommentaryTemplate(combined, ctx);
}
