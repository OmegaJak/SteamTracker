import { Game, ScrapeData, GameMap, PlaytimePoint } from "./Game";
import { classToClass } from "class-transformer";

export class HistoryFile {
	version?: number;
	games?: GameMap;
	lastRun: string;

	private scrapeDataTemp: ScrapeData[] | undefined;
	private gamesResponseTemp: GameMap | undefined;

	constructor(games?: GameMap, version?: number, lastRun?: string) {
		this.games = games;
		this.version = version;

		if (lastRun !== undefined) {
			this.lastRun = lastRun;
		} else if (this.games !== undefined && this.games.values().next().value.playtimeHistory !== undefined) {
			//this.lastRun = this.games[0].playtimeHistory[this.games[0].playtimeHistory.length - 1].date;
			let firstHist = this.games.values().next().value.playtimeHistory;
			this.lastRun = firstHist[firstHist.length - 1].date;
		} else {
			this.lastRun = new Date(0).toISOString(); // Just in case
		}
	}

	public isReady() {
		return (this.games !== undefined);
	}

	// Returns an object that's safe to write to the disk
	public getWriteableObject() {
		// This loses the types (like PlaytimeHist) but that's ok
		let gamesCopy = classToClass(this.games);
		if (gamesCopy === undefined)
			throw new Error("Somehow the historyFile games is still undefined by write time.");

		gamesCopy.forEach( game => {
			game.playtime2Weeks = undefined;
		});

		return {
			version: this.version,
			lastRun: new Date().toISOString(),
			games: Array.from(gamesCopy.values()),
		};
	}

	public addScrapeData(data: ScrapeData[]) {
		if (this.gamesResponseTemp === undefined) { // Scrape data was received before the games response
			this.scrapeDataTemp = data;
		} else {
			this.combineData(data, this.gamesResponseTemp);
			this.gamesResponseTemp = undefined;
		}
	}

	public addResponseGames(games: GameMap) {
		if (this.scrapeDataTemp === undefined) {
			this.gamesResponseTemp = games;
		} else {
			this.combineData(this.scrapeDataTemp, games);
			this.scrapeDataTemp = undefined;
		}
	}

	public getGameHistory(gameID: number): string {
		if (this.games === undefined)
			return "No Games Are Known!"; // Theoretically impossible to get here

		let game = this.games.get(gameID);
		if (game === undefined)
			return "Game could not be found!";

		let str = "Play History: \n";
		if (game.playtimeHistory !== undefined) {
			for (const hist of game.playtimeHistory) {
				str += new Date(hist.date).toLocaleString() + ": " + hist.playtime + "\n";
			}
		}
		return str;
	}

	public combineData(scrapeData: ScrapeData[], responseGames: GameMap) {
		scrapeData.forEach( scrapedGame => {
			let game = responseGames.get(scrapedGame.appid);
			if (game !== undefined && scrapedGame.last_played !== undefined) {
				game.lastPlayed = new Date(scrapedGame.last_played * 1000).toISOString(); // Date takes UTC milliseconds, last_played is UTC seconds

				if (game.playtime2Weeks === null) { // Prefer the playtime_2weeks gathered from the api call over the scrape data (it's in minutes, scrape is in hours)
					let hours = Number(scrapedGame.hours) * 60; // Valve stores playtime2Weeks in a var called hours
					game.playtime2Weeks = !isNaN(hours) ? hours : undefined;
				}
				// TODO: Examine why lastPlayed is stored as a string
			}
		});

		// This produces a list of all DLC... might be useful
		/*let dlc = scrapeData.filter( val => {
			let fdsa = false;
			for (let game of addTo) {
				if (val.appid === game.appid) {
					fdsa = true;
					break;
				}
			}
			return !fdsa;
		});*/

		this.games = responseGames;
	}

	/**
	 * When given another history file, this copies the lastPlayed value for each game in other
	 * into each game of this
	 */
	public copyLastPlayedFrom(other: HistoryFile) {
		if (!(other.games && this.games))
			throw new Error("Can't copy last played when the games object is undefined!");

		other.games.forEach( (game, appid) => {
			if (this.games && this.games.has(appid)) {
				this.games.get(appid)!.lastPlayed = game.lastPlayed;
			}
		});
	}
}
