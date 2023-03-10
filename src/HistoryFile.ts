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

	public getAllPlaytimeHistoryCsv() {
		//TODO: If game doesn't have lastPlayed from the response (which happened for Planet Crafter just after I had gotten it), default to deriving it from play history
		function roundTime(date: Date): number {
			return Math.floor(date.getTime() / 1000);
		}

		if (this.games === undefined) {
			return;
		}

		const gameCount = this.games.size;
		console.log("Game count: " + gameCount);
		const gameIndices = new Map<number, number>();
		let gameIndex = 0;
		this.games.forEach(game => {
			gameIndices.set(game.appid, gameIndex++);
		});
		console.log(gameIndices);
		const headerRow = new Array<string>();
		const firstColumn = new Array<Date>();
		const csvBody: number[][] = [];
		this.games.forEach(g => {
			g.playtimeHistory.forEach(point => {
				const columnIndex = gameIndices.get(g.appid);
				if (columnIndex === undefined) {
					console.error(`Unable to find index for game ${g.name} with appid ${g.appid}. Skipping.`);
				} else {
					const existingRowIndex = firstColumn.findIndex(date => roundTime(date) === roundTime(point.date));
					if (existingRowIndex > -1) {
						csvBody[existingRowIndex][columnIndex] = point.playtime;
					} else {
						let newRow = new Array<number>(gameCount);
						newRow[columnIndex] = point.playtime;
						firstColumn.push(point.date);
						csvBody.push(newRow);
					}
				}
			});
		});

		if (firstColumn.length !== csvBody.length) {
			console.error("Csv length issue:");
			console.log(firstColumn);
			console.log(csvBody);
		}

		console.log(csvBody);
		console.log(firstColumn);
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
