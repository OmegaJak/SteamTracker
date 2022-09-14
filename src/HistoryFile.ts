import { classToClass } from "class-transformer";
import { GameMap, PlaytimePoint, ScrapeData } from "./Game";
import { GameID, IDTracker } from "./IDTracker";

export class HistoryFile {
	version?: number;
	lastRun: Date;
	idTracker: IDTracker;
	games?: GameMap;

	private scrapeDataTemp: ScrapeData[] | undefined;
	private gamesResponseTemp: GameMap | undefined;

	constructor(games?: GameMap, version?: number, lastRun?: string, gameIDs?: GameID[]) {
		this.games = games;
		this.version = version;
		this.idTracker = new IDTracker(gameIDs);

		if (lastRun !== undefined) {
			this.lastRun = new Date(lastRun);
		} else if (this.games !== undefined && this.games.values().next().value.playtimeHistory !== undefined) {
			//this.lastRun = this.games[0].playtimeHistory[this.games[0].playtimeHistory.length - 1].date;
			let firstHist = this.games.values().next().value.playtimeHistory;
			this.lastRun = new Date(firstHist[firstHist.length - 1].date);
		} else {
			this.lastRun = new Date(0);
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

		gamesCopy.forEach( (game, appid) => {
			game.prepareForWrite();
		});

		return {
			version: this.version,
			lastRun: new Date(),
			idTracker: this.idTracker ? this.idTracker.gameIDs : undefined,
			games: Array.from(gamesCopy.values()),
		};
	}

	public getGameHistoryString(gameID: number): string {
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
