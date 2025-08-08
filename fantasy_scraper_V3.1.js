/**
 * F1 Fantasy Complete Data Scraper
 * 
 * A comprehensive web scraper for extracting F1 Fantasy driver data from the official
 * Formula 1 Fantasy website. Handles all drivers including team swap scenarios.
 * 
 * Features:
 * - Extracts all 21+ F1 drivers with complete race/sprint breakdowns
 * - Handles team swap drivers (Tsunoda, Lawson) by merging their data
 * - Extracts percentage picked data for each driver
 * - Extracts team information, positions, costs, and points
 * - Saves files as abbreviation.json (e.g., NOR.json, TSU.json)
 * - Generates comprehensive summary and ranking data
 * - Creates team-based breakdowns
 * - Handles sprint weekends automatically
 * - Manages race order dynamically from website
 * 
 * Output Files (exported to versioned folder based on most recent race):
 * Individual Driver Files ([round]-[raceName]/driver_data/):
 *   - NOR.json, PIA.json, VER.json, etc. (one per driver)
 * 
 * Summary Files ([round]-[raceName]/summary_data/):
 *   - weekend_summary.json: Points by race for all drivers
 *   - extraction_summary.json: Overall statistics and driver list
 *   - team_summary.json: Data grouped by team
 *   - percentage_picked_ranking.json: Drivers ranked by popularity
 * 
 * @version 3.1
 * @author Claude Code
 * @date 2025-08-08
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    BASE_URL: 'https://fantasy.formula1.com/en/statistics/details?tab=driver&filter=fPoints',
    OUTPUT_DIR: 'driver_data',
    SUMMARY_OUTPUT_DIR: 'summary_data',
    BROWSER_HEADLESS: false, // Set to true for production
    PROCESS_ALL_DRIVERS: true,
    DELAYS: {
        PAGE_LOAD: 5000,
        POPUP_WAIT: 3000,
        BETWEEN_DRIVERS: 2000,
        POPUP_CLOSE: 1000
    }
};

// Driver abbreviations mapping - maintains consistency across seasons
const DRIVER_ABBREVIATIONS = {
    'landonorrisdriver': 'NOR',
    'oscarpiastridriver': 'PIA', 
    'maxverstappendriver': 'VER',
    'georgerusselldriver': 'RUS',
    'lewishamiltondriver': 'HAM',
    'charlesleclercdriver': 'LEC',
    'carlossainzdriver': 'SAI',
    'sergioperezdriver': 'PER',
    'fernandoalonsodriver': 'ALO',
    'lancestrolldriver': 'STR',
    'pierregaslydriver': 'GAS',
    'estebanocondriver': 'OCO',
    'nicohulkenbergdriver': 'HUL',
    'kevinmagnussendriver': 'MAG',
    'valtteribottasdriver': 'BOT',
    'guanyuzhoudriver': 'ZHO',
    'alexanderalbondriver': 'ALB',
    'logansargeantdriver': 'SAR',
    'yukitsunodadriver': 'TSU',
    'danielricciardodriver': 'RIC',
    'kimiantonellidriver': 'ANT',
    'oliverbearmandriver': 'BEA',
    'isackhadjardriver': 'HAD',
    'gabrielbortoletodriver': 'BOR',
    'liamlawsondriver': 'LAW',
    'francocolapintodriver': 'COL',
    'jackdoohandriver': 'DOO'
};

// Team swap drivers - drivers who switched teams mid-season
const TEAM_SWAP_DRIVERS = {
    'yukitsunodadriver': {
        name: 'Yuki Tsunoda',
        abbreviation: 'TSU'
    },
    'liamlawsondriver': {
        name: 'Liam Lawson', 
        abbreviation: 'LAW'
    }
};

// Global data structures
const RACE_ORDER_MAP = new Map();
const driverBreakdowns = new Map();
const summaryData = new Map();
const processedDrivers = new Set();
const teamSwapData = new Map();
const driverListData = new Map();

/**
 * Main scraper function
 */
async function main() {
    const browser = await chromium.launch({ headless: CONFIG.BROWSER_HEADLESS });
    const page = await browser.newPage();
    
    try {
        console.log('🏁 F1 Fantasy Complete Data Scraper v3.1 Starting...');
        console.log(`📊 Target: ${CONFIG.BASE_URL}`);
        
        // Load page and handle consent
        await page.goto(CONFIG.BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
        await handleCookieConsent(page);
        await page.waitForSelector('.si-main__container', { timeout: 30000 });
        await page.waitForTimeout(CONFIG.DELAYS.PAGE_LOAD);
        
        // Extract driver list data (positions, teams, values)
        console.log('📋 Extracting driver list data...');
        const driverElements = await extractDriverListData(page);
        console.log(`✅ Found ${driverElements.length} drivers in main list`);
        
        // Establish race order from website
        console.log(`📅 Establishing race order...`);
        await establishRaceOrder(page, driverElements);
        
        // Process all drivers including team swaps
        await processAllDrivers(page, driverElements);
        
        // Merge team swap driver data
        await mergeTeamSwapDrivers();
        
        // Save all results
        await saveResults();
        
        console.log(`\n🎉 SCRAPING COMPLETE!`);
        console.log(`📊 Successfully processed ${driverBreakdowns.size} unique drivers`);
        console.log(`🔄 Team swap drivers handled: ${Array.from(driverBreakdowns.values()).filter(d => d.teamSwap).length}`);
        
        const mostRecentRace = getMostRecentRace();
        const versionFolder = `${mostRecentRace.round}-${mostRecentRace.raceName}`;
        console.log(`📁 Results exported to versioned folder: ${versionFolder}/`);
        console.log(`📁 Individual drivers: ${versionFolder}/driver_data/`);
        console.log(`📁 Summary data: ${versionFolder}/summary_data/`);
        
    } catch (error) {
        console.error('❌ Scraper failed:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

/**
 * Handle cookie consent dialog
 */
async function handleCookieConsent(page) {
    try {
        const iframeElement = await page.$('#sp_message_iframe_1336275');
        if (iframeElement) {
            const iframe = await iframeElement.contentFrame();
            if (iframe) {
                await iframe.click('button:has-text("Essential only cookies")', { timeout: 3000 });
                console.log('✅ Cookie consent handled');
                await page.waitForTimeout(2000);
            }
        }
    } catch (e) {
        console.log('ℹ️  No cookie consent dialog');
    }
}

/**
 * Extract comprehensive driver data from main list including teams, positions, costs
 */
async function extractDriverListData(page) {
    console.log('🔍 Extracting driver list data with teams...');
    
    const driverElements = await page.$$('div[class*="si-stats__list-item"]');
    const validDrivers = [];
    const driverSurnames = [
        'NORRIS', 'PIASTRI', 'VERSTAPPEN', 'RUSSELL', 'HAMILTON', 'LECLERC',
        'SAINZ', 'PEREZ', 'ALONSO', 'STROLL', 'GASLY', 'OCON', 'HULKENBERG',
        'MAGNUSSEN', 'BOTTAS', 'ZHOU', 'ALBON', 'SARGEANT', 'TSUNODA', 'RICCIARDO',
        'ANTONELLI', 'BEARMAN', 'HADJAR', 'BORTOLETO', 'LAWSON', 'COLAPINTO', 'DOOHAN'
    ];
    
    console.log(`📋 Analyzing ${driverElements.length} list elements...`);
    
    // Parse driver list data in groups of 4 (position, team, cost, points)
    for (let i = 0; i < driverElements.length - 3; i += 4) {
        try {
            const positionText = await driverElements[i].textContent();
            const teamText = await driverElements[i + 1].textContent();
            const costText = await driverElements[i + 2].textContent();
            const pointsText = await driverElements[i + 3].textContent();
            
            if (!positionText) continue;
            
            // Check if this is a driver row
            const hasDriverName = driverSurnames.some(surname => positionText.includes(surname));
            const positionMatch = positionText.trim().match(/^(\d+)/);
            
            if (hasDriverName && positionMatch) {
                const position = parseInt(positionMatch[1]);
                const driverName = positionText.replace(/^\d+/, '').trim();
                
                const driverInfo = {
                    element: driverElements[i],
                    index: i,
                    position: position,
                    name: driverName,
                    team: teamText?.trim() || 'Unknown',
                    cost: costText?.trim() || '0',
                    points: parseInt(pointsText?.trim()) || 0,
                    text: positionText.trim()
                };
                
                validDrivers.push(driverInfo);
                
                // Store in global map for later reference
                const cleanDriverName = driverName.toLowerCase().replace(/\s+/g, '') + 'driver';
                driverListData.set(cleanDriverName, driverInfo);
                
                console.log(`   📍 [${position}] ${driverName} | ${driverInfo.team} | ${driverInfo.cost} | ${driverInfo.points} pts`);
            }
        } catch (error) {
            // Skip this set of elements and continue
            continue;
        }
    }
    
    console.log(`📊 Extracted ${validDrivers.length} valid drivers from main list`);
    return validDrivers;
}

/**
 * Establish race order from website to maintain correct chronological order
 */
async function establishRaceOrder(page, driverElements) {
    try {
        // Find the first clickable driver to establish race order
        for (let i = 0; i < Math.min(5, driverElements.length); i++) {
            try {
                const driverData = driverElements[i];
                console.log(`📅 Establishing race order from: ${driverData.name}...`);
                
                await driverData.element.click();
                await page.waitForSelector('.si-popup__container', { timeout: 10000 });
                await page.waitForTimeout(CONFIG.DELAYS.POPUP_WAIT);
                
                const popup = await page.$('.si-popup__container');
                const accordionItems = await popup.$$('.si-accordion__box');
                
                let raceOrder = 1;
                for (const accordionItem of accordionItems) {
                    const raceNameElement = await accordionItem.$('.si-league__card-title span');
                    const raceName = await raceNameElement?.textContent();
                    
                    if (raceName && raceName !== 'Season') {
                        const raceNameTrimmed = raceName.trim();
                        const round = String(raceOrder).padStart(2, '0');
                        RACE_ORDER_MAP.set(raceNameTrimmed, round);
                        console.log(`   📅 Round ${round}: ${raceNameTrimmed}`);
                        raceOrder++;
                    }
                }
                
                await closePopup(page);
                console.log(`✅ Race order established: ${RACE_ORDER_MAP.size} races found`);
                return;
                
            } catch (error) {
                console.log(`   ⚠️  Failed to establish from ${driverElements[i]?.name || 'driver'}, trying next...`);
                await emergencyClosePopup(page);
                continue;
            }
        }
        
        throw new Error('Could not establish race order from any driver');
        
    } catch (error) {
        console.error(`❌ Error establishing race order: ${error.message}`);
        throw error;
    }
}

/**
 * Process all drivers including team swap handling
 */
async function processAllDrivers(page, driverElements) {
    console.log(`🏎️  Processing ${driverElements.length} drivers...`);
    
    for (let i = 0; i < driverElements.length; i++) {
        const driverData = driverElements[i];
        try {
            await processDriver(page, driverData, i);
            await page.waitForTimeout(CONFIG.DELAYS.BETWEEN_DRIVERS);
        } catch (error) {
            console.error(`❌ Error processing driver ${i + 1}: ${error.message}`);
            await emergencyClosePopup(page);
        }
    }
}

/**
 * Process individual driver data extraction
 */
async function processDriver(page, driverData, index) {
    try {
        console.log(`\n👤 Processing driver ${index + 1}/${driverListData.size}...`);
        console.log(`👆 Clicking: [${driverData.position}] ${driverData.name} (${driverData.team})`);
        
        // Click driver to open popup
        await driverData.element.click();
        await page.waitForSelector('.si-popup__container', { timeout: 10000 });
        await page.waitForTimeout(CONFIG.DELAYS.POPUP_WAIT);
        
        // Extract comprehensive driver data
        const extractedData = await extractDriverDataEnhanced(page, driverData);
        
        if (extractedData && extractedData.driverId) {
            const driverId = extractedData.driverId;
            
            // Check if this is a team swap driver
            if (TEAM_SWAP_DRIVERS[driverId]) {
                console.log(`🔄 Team swap driver detected: ${extractedData.name} (${extractedData.team})`);
                
                // Store this version for later merging
                if (!teamSwapData.has(driverId)) {
                    teamSwapData.set(driverId, []);
                }
                teamSwapData.get(driverId).push(extractedData);
                
                console.log(`✅ Stored version ${teamSwapData.get(driverId).length} for ${extractedData.name} with ${extractedData.team}`);
                
            } else {
                // Regular driver processing
                if (processedDrivers.has(driverId)) {
                    console.log(`⚠️  DUPLICATE: ${driverId} already processed, skipping...`);
                } else {
                    processedDrivers.add(driverId);
                    
                    if (extractedData.races.length > 0) {
                        driverBreakdowns.set(driverId, extractedData);
                        updateSummaryData(extractedData);
                        
                        const totalRacePoints = extractedData.races.reduce((sum, race) => sum + race.totalPoints, 0);
                        console.log(`✅ SUCCESS: ${extractedData.name} (${extractedData.abbreviation}) - ${extractedData.team}`);
                        console.log(`   📊 ${extractedData.races.length} races, ${totalRacePoints} total points, ${extractedData.percentagePicked}% picked`);
                    }
                }
            }
        } else {
            console.log(`❌ No driver data extracted for driver ${index + 1}`);
        }
        
        await closePopup(page);
        
    } catch (error) {
        console.error(`❌ Error processing driver ${index + 1}: ${error.message}`);
        await emergencyClosePopup(page);
    }
}

/**
 * Extract comprehensive driver data including percentage picked and team info
 */
async function extractDriverDataEnhanced(page, listDriverData) {
    const popup = await page.$('.si-popup__container');
    if (!popup) return null;
    
    // Extract basic info including percentage picked
    const basicInfo = await page.evaluate(() => {
        const popup = document.querySelector('.si-popup__container');
        if (!popup) return null;
        
        const fullText = popup.textContent || '';
        
        // Extract driver name
        let driverName = 'unknown_driver';
        const playerNameDiv = popup.querySelector('.si-player__name');
        if (playerNameDiv) {
            const playerText = playerNameDiv.textContent.trim().toLowerCase();
            const cleanName = playerText.replace(/\s+/g, '') + 'driver';
            if (cleanName.match(/^[a-z]+driver$/)) {
                driverName = cleanName;
            }
        }
        
        // Fallback name extraction
        if (driverName === 'unknown_driver') {
            const cleanedText = fullText.replace(/^\s*Inactive\s*/i, '').trim();
            const nameMatch = cleanedText.match(/^([a-z]+driver)/i);
            if (nameMatch) {
                driverName = nameMatch[1].toLowerCase();
            }
        }
        
        // Extract value, season points, and percentage picked
        const valueMatch = fullText.match(/\$([0-9.]+M)/);
        const seasonPointsMatch = fullText.match(/Season Points\s+(\d+)\s+Pts/i);
        
        // Extract percentage picked with multiple fallback patterns
        let percentagePicked = 0;
        const percentagePatterns = [
            /Percentage Picked\s+(\d+)\s*%/i,
            /(\d+)\s*%/,
            /picked\s+(\d+)%/i
        ];
        
        for (const pattern of percentagePatterns) {
            const match = fullText.match(pattern);
            if (match) {
                percentagePicked = parseInt(match[1]);
                break;
            }
        }
        
        // Also try to find percentage in specific elements
        if (percentagePicked === 0) {
            const percentageElements = popup.querySelectorAll('.si-driCon__list-stats span, .si-driCon__list-stats em');
            for (const el of percentageElements) {
                const text = el.textContent || '';
                const match = text.match(/(\d+)\s*%/);
                if (match) {
                    percentagePicked = parseInt(match[1]);
                    break;
                }
            }
        }
        
        const displayName = playerNameDiv ? playerNameDiv.textContent.trim() : driverName;
        
        return {
            driverName: driverName,
            displayName: displayName,
            driverValue: valueMatch ? valueMatch[1] : '0',
            seasonTotalPoints: seasonPointsMatch ? parseInt(seasonPointsMatch[1]) : 0,
            percentagePicked: percentagePicked,
            isInactive: fullText.includes('Inactive')
        };
    });
    
    if (!basicInfo || !basicInfo.driverName) return null;
    
    const abbreviation = DRIVER_ABBREVIATIONS[basicInfo.driverName] || 'UNK';
    const teamInfo = listDriverData.team || 'Unknown';
    
    console.log(`   🔍 Extracted: ${basicInfo.driverName} -> ${abbreviation} (${teamInfo}) - ${basicInfo.percentagePicked}% picked`);
    
    // Extract race data
    const races = [];
    const accordionItems = await popup.$$('.si-accordion__box');
    
    for (const accordionItem of accordionItems) {
        try {
            const raceNameElement = await accordionItem.$('.si-league__card-title span');
            const raceName = await raceNameElement?.textContent();
            
            const totalElement = await accordionItem.$('.si-totalPts__counts em');
            const totalText = await totalElement?.textContent();
            const raceTotal = totalText ? parseInt(totalText) : 0;
            
            if (raceName === 'Season' || !raceName) continue;
            
            const raceNameTrimmed = raceName.trim();
            const round = RACE_ORDER_MAP.get(raceNameTrimmed) || '00';
            
            const sessionData = await extractSessionDataEnhanced(accordionItem);
            
            races.push({
                round: round,
                raceName: raceName.trim(),
                totalPoints: raceTotal,
                ...sessionData
            });
        } catch (error) {
            console.log(`⚠️  Error processing race: ${error.message}`);
        }
    }
    
    // Sort races by round number
    races.sort((a, b) => a.round.localeCompare(b.round));
    
    return {
        driverId: basicInfo.driverName.replace(/[^a-z0-9]/g, '_'),
        name: basicInfo.driverName,
        displayName: basicInfo.displayName,
        abbreviation: abbreviation,
        team: teamInfo,
        position: listDriverData.position,
        value: basicInfo.driverValue,
        seasonTotalPoints: basicInfo.seasonTotalPoints,
        percentagePicked: basicInfo.percentagePicked,
        isInactive: basicInfo.isInactive,
        races: races,
        extractedAt: new Date().toISOString()
    };
}

/**
 * Merge data for drivers who switched teams mid-season
 */
async function mergeTeamSwapDrivers() {
    console.log(`\n🔄 Merging team swap drivers...`);
    
    for (const [driverId, versions] of teamSwapData) {
        if (versions.length < 2) {
            console.log(`⚠️  ${driverId}: Only ${versions.length} version found, adding as regular driver`);
            if (versions.length === 1) {
                driverBreakdowns.set(driverId, versions[0]);
                updateSummaryData(versions[0]);
            }
            continue;
        }
        
        console.log(`🔄 Merging ${versions.length} versions of ${driverId}...`);
        
        // Sort versions by position to get the current/main one first
        versions.sort((a, b) => a.position - b.position);
        const mainVersion = versions[0];
        
        // Create merged driver data
        const mergedDriver = {
            driverId: driverId,
            name: mainVersion.name,
            displayName: mainVersion.displayName,
            abbreviation: mainVersion.abbreviation,
            team: mainVersion.team,
            position: mainVersion.position,
            value: mainVersion.value,
            percentagePicked: mainVersion.percentagePicked,
            teamSwap: true,
            teams: versions.map(v => v.team).filter(team => team !== 'Unknown'),
            teamSwapDetails: versions.map(v => ({
                team: v.team,
                position: v.position,
                value: v.value,
                points: v.seasonTotalPoints
            })),
            seasonTotalPoints: versions.reduce((sum, v) => sum + (v.seasonTotalPoints || 0), 0),
            races: [],
            extractedAt: new Date().toISOString(),
            versions: versions.length
        };
        
        // Collect all races from all versions
        const allRaces = new Map();
        
        for (const version of versions) {
            console.log(`   📊 Processing version: ${version.team} (${version.races.length} races, ${version.seasonTotalPoints} pts)`);
            
            for (const race of version.races) {
                const raceKey = `${race.round}-${race.raceName}`;
                
                if (!allRaces.has(raceKey)) {
                    allRaces.set(raceKey, {
                        ...race,
                        team: version.team,
                        source: 'single'
                    });
                } else {
                    // If conflicting data, prefer version with more points
                    const existing = allRaces.get(raceKey);
                    if (Math.abs(race.totalPoints) > Math.abs(existing.totalPoints)) {
                        allRaces.set(raceKey, {
                            ...race,
                            team: version.team,
                            source: 'conflict-resolved',
                            conflictWith: existing.team
                        });
                        console.log(`   ⚡ Resolved conflict for ${race.raceName}: chose ${version.team} data (${race.totalPoints} pts) over ${existing.team} (${existing.totalPoints} pts)`);
                    }
                }
            }
        }
        
        // Sort races and add to merged driver
        mergedDriver.races = Array.from(allRaces.values()).sort((a, b) => a.round.localeCompare(b.round));
        
        console.log(`✅ Merged ${driverId}:`);
        console.log(`   🏆 Combined season points: ${mergedDriver.seasonTotalPoints}`);
        console.log(`   🏁 Teams: ${mergedDriver.teams.join(' → ')}`);
        console.log(`   📊 Total races: ${mergedDriver.races.length}`);
        console.log(`   📈 Percentage picked: ${mergedDriver.percentagePicked}%`);
        
        // Add to main data structures
        driverBreakdowns.set(driverId, mergedDriver);
        updateSummaryData(mergedDriver);
    }
}

/**
 * Extract session data for races and sprints
 */
async function extractSessionDataEnhanced(raceElement) {
    const sessionData = {
        race: {
            dotd: 0,
            position: 0,
            qualifyingPosition: 0,
            fastestLap: 0,
            overtakeBonus: 0
        }
    };
    
    // Check if this is a sprint weekend
    const hasSprintSession = await raceElement.$('.si-tabs__wrap button:has-text("Sprint")');
    if (hasSprintSession) {
        sessionData.sprint = {
            position: 0,
            qualifyingPosition: 0,
            fastestLap: 0,
            overtakeBonus: 0
        };
    }
    
    try {
        const tables = await raceElement.$$('table.si-tbl');
        
        for (const table of tables) {
            const rows = await table.$$('tbody tr');
            
            for (const row of rows) {
                const cells = await row.$$('td');
                if (cells.length >= 3) {
                    const eventName = await cells[0].textContent();
                    const pointsText = await cells[2].textContent();
                    
                    const isNegative = await cells[2].evaluate(cell => cell.classList.contains('si-negative'));
                    
                    let points = 0;
                    if (pointsText && pointsText.trim() !== '-') {
                        const pointsMatch = pointsText.match(/(-?)(\d+)/);
                        if (pointsMatch) {
                            points = parseInt(pointsMatch[2]);
                            if (isNegative || pointsMatch[1] === '-') {
                                points = -Math.abs(points);
                            }
                        }
                    }
                    
                    // Map events to structure
                    const eventLower = eventName?.toLowerCase() || '';
                    
                    if (eventLower.includes('driver of the day')) {
                        sessionData.race.dotd = points;
                    } else if (eventLower.includes('race position') && !eventLower.includes('gained') && !eventLower.includes('lost')) {
                        sessionData.race.position = points;
                    } else if (eventLower.includes('qualifying position')) {
                        sessionData.race.qualifyingPosition = points;
                    } else if (eventLower.includes('race fastest lap')) {
                        sessionData.race.fastestLap = points;
                    } else if (eventLower.includes('race overtake bonus') || eventLower.includes('race positions gained') || eventLower.includes('race positions lost')) {
                        sessionData.race.overtakeBonus += points;
                    } else if (eventLower.includes('sprint position') && !eventLower.includes('gained') && !eventLower.includes('lost')) {
                        if (sessionData.sprint) sessionData.sprint.position = points;
                    } else if (eventLower.includes('sprint fastest lap')) {
                        if (sessionData.sprint) sessionData.sprint.fastestLap = points;
                    } else if (eventLower.includes('sprint overtake bonus') || eventLower.includes('sprint positions gained') || eventLower.includes('sprint positions lost')) {
                        if (sessionData.sprint) sessionData.sprint.overtakeBonus += points;
                    }
                }
            }
        }
    } catch (error) {
        console.log(`⚠️  Error parsing session data: ${error.message}`);
    }
    
    return sessionData;
}

/**
 * Update summary data for weekend overview
 */
function updateSummaryData(driverData) {
    for (const race of driverData.races) {
        if (!summaryData.has(race.round)) {
            summaryData.set(race.round, {
                round: race.round,
                raceName: race.raceName,
                drivers: new Map()
            });
        }
        
        const raceData = summaryData.get(race.round);
        raceData.drivers.set(driverData.abbreviation, race.totalPoints);
    }
}

/**
 * Close popup window
 */
async function closePopup(page) {
    try {
        const closeButton = await page.$('.si-popup__close');
        if (closeButton) {
            await closeButton.click();
            await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
            return;
        }
    } catch (e) {}
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
}

/**
 * Emergency popup close in case of errors
 */
async function emergencyClosePopup(page) {
    try {
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
    } catch (e) {}
}

/**
 * Save all results to JSON files
 */
/**
 * Find the most recent race for versioned export folder naming
 */
function getMostRecentRace() {
    let maxRound = 0;
    let mostRecentRace = { round: '00', raceName: 'Unknown' };
    
    for (const driver of driverBreakdowns.values()) {
        for (const race of driver.races) {
            const roundNum = parseInt(race.round);
            if (roundNum > maxRound) {
                maxRound = roundNum;
                mostRecentRace = race;
            }
        }
    }
    
    return mostRecentRace;
}

async function saveResults() {
    console.log('\n💾 Saving results...');
    
    // Get most recent race for versioned folder naming
    const mostRecentRace = getMostRecentRace();
    const versionFolder = `${mostRecentRace.round}-${mostRecentRace.raceName}`;
    
    const versionedOutputDir = path.join(versionFolder, 'driver_data');
    const versionedSummaryDir = path.join(versionFolder, 'summary_data');
    
    console.log(`📁 Exporting to versioned folder: ${versionFolder}/`);
    
    // Clear existing data
    try {
        await fs.rm(versionFolder, { recursive: true, force: true });
    } catch (e) {}
    
    await fs.mkdir(versionedOutputDir, { recursive: true });
    await fs.mkdir(versionedSummaryDir, { recursive: true });
    
    // Save individual driver files using abbreviation.json format
    for (const [driverId, driverData] of driverBreakdowns) {
        const filename = `${driverData.abbreviation}.json`;
        const filepath = path.join(versionedOutputDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(driverData, null, 2));
        
        const swapIndicator = driverData.teamSwap ? ' [TEAM SWAP]' : '';
        console.log(`✅ Saved: ${filename} (${driverData.races.length} races, ${driverData.percentagePicked}% picked)${swapIndicator}`);
    }
    
    // Create weekend summary
    const weekendSummary = {};
    
    for (const [round, raceData] of summaryData) {
        weekendSummary[round] = {
            raceName: raceData.raceName,
            drivers: Object.fromEntries(raceData.drivers)
        };
    }
    
    // Sort by round number
    const sortedSummary = {};
    Object.keys(weekendSummary)
        .sort()
        .forEach(key => {
            sortedSummary[key] = weekendSummary[key];
        });
    
    await fs.writeFile(
        path.join(versionedSummaryDir, 'weekend_summary.json'), 
        JSON.stringify(sortedSummary, null, 2)
    );
    
    console.log('✅ Weekend summary saved: weekend_summary.json');
    
    // Create comprehensive extraction summary
    const detailedSummary = {
        extractedAt: new Date().toISOString(),
        totalDrivers: driverBreakdowns.size,
        teamSwapDrivers: Array.from(driverBreakdowns.values()).filter(d => d.teamSwap).length,
        totalRaces: Array.from(driverBreakdowns.values()).reduce((sum, driver) => sum + driver.races.length, 0),
        averagePercentagePicked: Math.round(Array.from(driverBreakdowns.values()).reduce((sum, d) => sum + d.percentagePicked, 0) / driverBreakdowns.size),
        drivers: Array.from(driverBreakdowns.values()).map(driver => ({
            abbreviation: driver.abbreviation,
            name: driver.displayName,
            team: driver.team,
            position: driver.position,
            value: driver.value,
            seasonTotal: driver.seasonTotalPoints,
            percentagePicked: driver.percentagePicked,
            racesFound: driver.races.length,
            teamSwap: driver.teamSwap || false,
            teams: driver.teams || []
        })).sort((a, b) => a.position - b.position)
    };
    
    await fs.writeFile(
        path.join(versionedSummaryDir, 'extraction_summary.json'), 
        JSON.stringify(detailedSummary, null, 2)
    );
    
    console.log('✅ Extraction summary saved: extraction_summary.json');
    
    // Create team breakdown summary
    const teamSummary = {};
    Array.from(driverBreakdowns.values()).forEach(driver => {
        if (!teamSummary[driver.team]) {
            teamSummary[driver.team] = {
                drivers: [],
                totalPoints: 0,
                averagePercentagePicked: 0
            };
        }
        
        teamSummary[driver.team].drivers.push({
            abbreviation: driver.abbreviation,
            name: driver.displayName,
            points: driver.seasonTotalPoints,
            percentagePicked: driver.percentagePicked,
            value: driver.value,
            position: driver.position
        });
        
        teamSummary[driver.team].totalPoints += driver.seasonTotalPoints;
    });
    
    // Calculate averages
    Object.keys(teamSummary).forEach(team => {
        const teamData = teamSummary[team];
        teamData.averagePercentagePicked = Math.round(
            teamData.drivers.reduce((sum, d) => sum + d.percentagePicked, 0) / teamData.drivers.length
        );
        teamData.drivers.sort((a, b) => a.position - b.position);
    });
    
    await fs.writeFile(
        path.join(versionedSummaryDir, 'team_summary.json'), 
        JSON.stringify(teamSummary, null, 2)
    );
    
    console.log('✅ Team summary saved: team_summary.json');
    
    // Create percentage picked ranking (simple abbreviation: percentage format)
    const percentagePickedRanking = {};
    Array.from(driverBreakdowns.values())
        .sort((a, b) => b.percentagePicked - a.percentagePicked)
        .forEach(driver => {
            percentagePickedRanking[driver.abbreviation] = driver.percentagePicked;
        });
    
    await fs.writeFile(
        path.join(versionedSummaryDir, 'percentage_picked_ranking.json'), 
        JSON.stringify(percentagePickedRanking, null, 2)
    );
    
    console.log('✅ Percentage picked ranking saved: percentage_picked_ranking.json');
}

// Run scraper if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, CONFIG };