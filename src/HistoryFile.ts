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
}
