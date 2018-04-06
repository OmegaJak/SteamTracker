import { remote } from "electron";
const dialog = remote.dialog;

import { ipcRenderer } from "electron";
import { addDays, differenceInDays, differenceInMinutes, subMinutes, subDays } from "date-fns";
import { classToClass, plainToClass, deserializeArray } from "class-transformer";
import jetpack = require("fs-jetpack");
import Vue from "Vue";

import { PlaytimePoint, Game, ScrapeData, GameMap } from "./Game";
import { HistoryFile } from "./HistoryFile";
import Events from "./Events";
import { IDTracker } from "./IDTracker";
import SteamData from "./datasource/SteamSource";
import MinecraftData from "./datasource/MinecraftSource";
import DataSource from "./datasource/DataSource";

const isDevMode = process.execPath.match(/[\\/]electron/);
console.log("isDevMode: " + (isDevMode !== null));
let jsonPath = "";
if (isDevMode) {
	jsonPath = process.execPath.match(/.*[\\/]SteamTracker[\\/]/) + "json/";
} else {
	jsonPath = remote.app.getPath("documents") + "/SteamTracker/";
}

const dataFilePath = "Play History.json";
const CurrentFileVersion: number = 0.3;

export class DataManager {
	public historyFile: HistoryFile;

	private eventBus: Vue;
	private rawFile: any;

	constructor(bus: Vue) {
		this.eventBus = bus;
		this.historyFile = new HistoryFile();
		this.historyFile.version = CurrentFileVersion;
	}

	public onReady() {
		console.time("mainUpdate");
		console.time("readFile");
		this.eventBus.$emit(Events.fetchingData, true, "Reading File on Disk...");
		jetpack.readAsync(jsonPath + "Play History.json", "json")
		.then( file => {
			console.timeEnd("readFile");
			this.rawFile = file;

			if (file) {
				this.eventBus.$emit(Events.gamesUpdated, this.rawFile.games);

				migrateData(file);

				this.historyFile = new HistoryFile(parseGamesArray(file.games), file.version, file.lastRun, file.gameIDs);
				this.historyFile.version = CurrentFileVersion;
			}

			this.updateSources();
		});
	}

	public writeHistory() {
		jetpack.write(jsonPath + "Play History.json", this.historyFile.getWriteableObject());
	}

	private async updateSources() {
		await this.updateFromSrc(new SteamData(), "Fetching Steam Data...");
		await this.updateFromSrc(new MinecraftData("C:/Users/JAK/MultiMC/instances", this.historyFile.idTracker),
									"Updating Minecraft Data...");

		console.timeEnd("mainUpdate");
	}

	private async updateFromSrc(src: DataSource, updateMsg: string) {
		this.eventBus.$emit(Events.fetchingData, true, updateMsg);
		console.log(updateMsg);

		let data: GameMap = await src.getData();

		// TODO: This is only a temporary hack until a more generalized solution is implemented.
		// Because MinecraftData only returns a GameMap with minecraft in it, the current implementation
		// would think that all other games had been removed if this wasn't done.
		/* if (src instanceof MinecraftData) {
			let minecraft = Array.from(data.values())[0];
			if (this.historyFile.games !== undefined) {
				data = classToClass(this.historyFile.games);
				data.set(minecraft.appid, minecraft);
			}
		} */
		this.updateData(data, src.srcName);

		this.eventBus.$emit(Events.fetchingData, false);
	}

	private updateData(newData: GameMap, dataSrc: string) {
		if (this.historyFile.games === undefined) {
			this.historyFile.games = initializeGames(newData);
		} else {
			this.historyFile.games = updateGameHistory(newData, this.historyFile.games, this.historyFile.lastRun, dataSrc);
		}

		this.eventBus.$emit(Events.gamesUpdated, this.historyFile.games);

		this.writeHistory();
	}
}

function parseGamesArray(games): GameMap {
	function convertToGamesArr(rawArr: any): Game[] {
		let gamesArr = deserializeArray(Game, JSON.stringify(rawArr));

		for (let game of gamesArr) {
			if (game.children !== undefined)
				game.children = convertToGamesArr(game.children);
		}

		return gamesArr;
	}

	return mapFromGames(convertToGamesArr(games));
}

function updateGameHistory(newGamesData: GameMap, oldGamesData: GameMap, lastRun: string, dataSrc: string): GameMap {
	console.log("Updating data");

	// if it finds an unplayed game, it should update the only date there to the current date

	// games in newGamesData that aren't in oldGamesData
	let newGames = Array.from(newGamesData.values()).filter( game => {
		return !oldGamesData.has(game.appid);
	});

	newGames.forEach(newGame => {
		console.log("Found a new game: " + newGame.name);
		let oldGame = initGame(newGame);
		oldGame.setZero(lastRun);
		updateGame(oldGame, newGame, lastRun, true, dataSrc);
		oldGamesData.set(oldGame.appid, oldGame); // Don't think this is necessary
	});

	let responseGame: Game | undefined;
	oldGamesData.forEach( (oldGame, appid) => {
		if (!oldGame.ignored) {
			if ((oldGame.source === undefined && dataSrc === "Steam") || oldGame.source === dataSrc) {
				responseGame = newGamesData.get(appid);
				if (responseGame === undefined) {
					if (oldGame.keep === undefined || !oldGame.keep) {
						getConfirmation(oldGame.name + " has been removed. \n" + "Would you like to keep its data anyway?",
										() => { oldGame.keep = true; updateGame(oldGame, oldGame, lastRun, false, dataSrc); },
										() => { oldGamesData.delete(appid); });
					}
				} else {
					updateGame(oldGame, responseGame, lastRun, false, dataSrc);
				}
			}
		}
	});
	return oldGamesData;
}

function updateGame(oldGame: Game, newGame: Game, lastRun: string, isNewGame: boolean, dataSrc: string) {
	function helper(children?: Game[]): GameMap {
		return children !== undefined ? mapFromGames(children) : new Map<number, Game>();
	}

	gameUpdateLogic(oldGame, newGame, lastRun, isNewGame);

	let oldMap = helper(oldGame.children);
	let newMap = helper(newGame.children);

	if (oldMap.size > 0 || newMap.size > 0) {
		// The dataSrc is set to the default of "Steam" because it isn't necessary for children.
		// If we're comparing children, they must be from the same parent, and two versions of the same
		// parent are obviously from the same source.
		oldGame.children = Array.from(updateGameHistory(newMap, oldMap, lastRun, "Steam").values());
		if (oldGame.children.length === 0)
			oldGame.children = undefined;
	}
}

function gameUpdateLogic(oldGame: Game, responseGame: Game, mostRecentDate: string, isNewGame: boolean) {
	let now = new Date();

	if (isNewGame && responseGame.playtime2Weeks) {
		let difference = responseGame.totalPlaytime - responseGame.playtime2Weeks;
		if (difference < 6)
			responseGame.playtime2Weeks += difference;
	}

	let hist = oldGame.playtimeHistory;
	if (hist === undefined)
		throw new Error("PlaytimeHistory shouldn't be undefined in gameUpdateLogic!");

	let diff = responseGame.totalPlaytime - oldGame.totalPlaytime;

	if (diff > 0) { // If the game has been played since the last update
		let dayDiff = differenceInDays(now, mostRecentDate);
		if (dayDiff > 14) { // If it's been over two weeks since the last update
			if (responseGame.playtime2Weeks === undefined) { // And the game hasn't been played in the last two weeks
				oldGame.addHistPoint(subDays(now, 14), diff); // Then the playtime increase must've happened at least before two weeks ago
			} else { // The game has been played in the last two weeks
				let timePreTwoWeeksAgo = Math.max(diff - responseGame.playtime2Weeks, 0); // How much was played before two weeks ago
				if (timePreTwoWeeksAgo !== 0) {
					oldGame.addHistPoint(subDays(now, 14), timePreTwoWeeksAgo);
				}
				// The min below handles all cases: when diff < 2weeks, diff = 2weeks, diff > 2weeks. Necessary because this path is taken by new games
				determineChunkage(oldGame, responseGame, mostRecentDate, Math.min(diff, responseGame.playtime2Weeks));
				oldGame.addHistPoint(lastPlayed(responseGame), responseGame.playtime2Weeks);
			}
		} else { // It's been less than two weeks since the last update
			determineChunkage(oldGame, responseGame, mostRecentDate, diff);
			oldGame.addHistPoint(lastPlayed(responseGame), diff); // Then the difference must be entirely between the last update and the last played date
		}
		oldGame.setZero(now);
	} else { // No playtime change
		oldGame.setZero(now);
	}

	updateOtherProperties(responseGame, oldGame);
}

function updateOtherProperties(newGame: Game, oldGame: Game) {
	Object.keys(newGame).forEach(key => {
		if (key !== "playtimeHistory" && key !== "children" && newGame[key] !== undefined) {
			if (oldGame[key] !== undefined && newGame[key] !== oldGame[key]) {
				if (key === "lastPlayed" || key === "totalPlaytime") {
					oldGame[key] = newGame[key];
				} else {
					getConfirmation(`Would you like to update the ${key} property of ${oldGame.name} from
						"${oldGame[key]}" to "${newGame[key]}"?`, () => { oldGame[key] = newGame[key]; });
				}
			} else {
				oldGame[key] = newGame[key];
			}
		}
	});
}

function determineChunkage(oldGame: Game, responseGame: Game, mostRecentDate: string, diff: number) { // May or may not support updates mid-game
	let prePlay = subMinutes(lastPlayed(responseGame), diff); // Basically the time when the game would've been started had the recent playtime been in one chunk
	if (Math.abs(differenceInMinutes(prePlay, mostRecentDate)) > 5) { // If it had been over 5 minutes between when the game was last checked and it was theoretically started
		getConfirmation("Was the recent " + diff + " minutes of " + responseGame.name + " in one chunk?\n" +
						" (it was last played on " + lastPlayed(responseGame).toLocaleString() + ")", () => {
							// Bring the zero up to just before the game would've been started
							oldGame.setZero(prePlay);
						});
	}
}

function lastPlayed(game: Game, otherwise = new Date()): Date {
	if (game.lastPlayed !== undefined) {
		return new Date(game.lastPlayed);
	} else {
		return otherwise;
	}
}

function mapFromGames(games: Game[]): GameMap {
	let map = new Map<number, Game>();
	for (let game of games) {
		map.set(game.appid, game);
	}

	return map;
}

function initializeGames(srcData: GameMap): GameMap {
	let newGames: GameMap = new Map<number, Game>();

	srcData.forEach( game => {
		let oldGame: Game = initGame(game);

		game.playtimeHistory = [];

		gameUpdateLogic(oldGame, game, subDays(new Date(), 100).toISOString(), true);
		newGames.set(oldGame.appid, oldGame);
	});

	return newGames;
}

function initGame(game: Game) {
	let toReturn: Game = classToClass(game);
	toReturn.playtimeHistory = [];
	toReturn.totalPlaytime = 0;
	if (game.children !== undefined) {
		let newChildren: Game[] = [];
		for (let child of game.children) {
			newChildren.push(initGame(child));
		}
		toReturn.children = newChildren;
	}

	return toReturn;
}

// Migrates between save formats, if necessary
function migrateData(file) { // TODO: Investigate whether this is still valid
	if (file.version !== CurrentFileVersion) {
		if (!file.version) { // Migrate from 0.1 -> 0.2
			file.version = 0.2;
			for (let game of file.games) {
				game.totalPlaytime = game.playtime_total;
				game.playtimeHistory = game.playtime_history;
				game.iconURL = game.img_icon_url;
				game.logoURL = game.img_logo_url;

				game.playtime_total = undefined;
				game.playtime_history = undefined;
				game.img_icon_url = undefined;
				game.img_logo_url = undefined;
			}
		}

		// Nothing necessary for 0.2 -> 0.3
	}
}

function getConfirmation(question: string, yesCallback: (() => void), noCallback?: (() => void)): number {
	let response = dialog.showMessageBox({ type: "question", buttons: ["Yes", "No"], title: "Question", message: question});
	if (response === 0) {
		yesCallback();
	} else if (response === 1) {
		if (noCallback !== undefined)
			noCallback();
	}
	return response;
}

/*function runTests() {
	const BSResponseOne = [
		{
			"appid": 220,
			"name": "Half-Life 2",
			"playtime_2weeks": 20,
			"playtime_forever": 321,
			"last_played": "2017-08-03T01:22:25.000Z"
		},
		{
			"appid": 340,
			"name": "Half-Life 2: Lost Coast",
			"playtime_forever": 1,
			"last_played": "2015-11-18T03:58:08.000Z"
		},
		{
			"appid": 320,
			"name": "Half-Life 2: Deathmatch",
			"playtime_forever": 268,
			"last_played": "2015-11-18T03:58:08.000Z"
		},
		{
			"appid": 3000,
			"name": "Half-Life 2: Death",
			"playtime_forever": 200,
			"last_played": "2015-11-18T03:58:08.000Z"
		},
		{
			"appid": 3001,
			"name": "Half-Life 3!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
			"playtime_forever": 0
		},
		{
			"appid": 360,
			"name": "Half-Life Deathmatch: Source",
			"playtime_forever": 0,
		}];

	const UpdateResultOne = updateData(BSResponseOne, undefined);

	const BSResponseTwo = [
		{
			"appid": 220,
			"name": "Half-Life 2",
			"playtime_2weeks": 50,
			"playtime_forever": 351,
			"last_played": "2017-08-06T01:22:25.000Z"
		},
		{
			"appid": 340,
			"name": "Half-Life 2: Lost Coast",
			"playtime_forever": 200,
			"playtime_2weeks": 80,
			"last_played": "2017-08-03T03:58:08.000Z"
		},
		{
			"appid": 320,
			"name": "Half-Life 2: Deathmatch",
			"playtime_forever": 350,
			"last_played": "2017-07-20T03:58:08.000Z"
		},
		{
			"appid": 3000,
			"name": "Half-Life 2: Death",
			"playtime_forever": 5000,
			"playtime_2weeks": 4800,
			"last_played": "2017-08-05T03:58:08.000Z"
		},
		{
			"appid": 3001,
			"name": "Half-Life 3!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
			"playtime_forever": 9001,
			"playtime_2weeks": 9001
		},
		{
			"appid": 360,
			"name": "Half-Life Deathmatch: Source",
			"playtime_forever": 0,
		}];

	const updateResultTwo = updateData(BSResponseTwo, UpdateResultOne);

	jetpack.write(jsonPath + "tests.json", { "BSResponseOne": BSResponseOne, "UpdateResultOne": UpdateResultOne, "BSResponseTwo": BSResponseTwo, "updateResultTwo": updateResultTwo });
}*/
