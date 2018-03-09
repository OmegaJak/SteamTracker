import { remote } from "electron";
const dialog = remote.dialog;

import { ipcRenderer } from "electron";
import { addDays, differenceInDays, differenceInMinutes, subMinutes, subDays } from "date-fns";
import { classToClass, plainToClass, deserializeArray } from "class-transformer";
import jetpack = require("fs-jetpack");
import Vue from "Vue";

import { PlaytimePoint, Game, ScrapeData, GameMap } from "./Game";
import { HistoryFile } from "./HistoryFile";

const isDevMode = process.execPath.match(/[\\/]electron/);
console.log("isDevMode: " + (isDevMode !== null));
let jsonPath = "";
if (isDevMode) {
	jsonPath = "D:/Documents/Creation/SteamTracker2/VueSteamTracker/json/";
} else {
	jsonPath = "C:/Users/JAK/Documents/SteamTracker/";
}

const dataFilePath = "Play History.json";
const CurrentFileVersion: number = 0.2;

export class DataManager {
	public historyFile: HistoryFile;

	private eventBus: Vue;

	constructor(bus: Vue) {
		this.eventBus = bus;
		this.historyFile = new HistoryFile();
		this.historyFile.version = CurrentFileVersion;
	}

	public onReady() {
		ipcRenderer.send("gamesScrapeRequest");
		ipcRenderer.on("gamesScrapeResponse", (event, arg) => {
			console.log("Scrape response received:");
			console.log(arg);
			this.historyFile.addScrapeData(arg as ScrapeData[]);
			this.tryUpdateData();
		});

		const fields = [
			"key=PUTYOURKEYHERE",
			"steamid=PUTYOURIDHERE",
			"format=json",
			"include_appinfo=1",
			"include_played_free_games=1",
		];

		const params = fields.join("&");
		const url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?" + params;
		console.log(url);

		const xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = () => {
			if (xhttp.readyState === 4 && xhttp.status === 200) {
				const response = JSON.parse(xhttp.response);
				console.log("Response:");
				console.log(response);

				let responseGames: GameMap = new Map<number, Game>();
				let currentGame: Game;
				for (const responseGame of response.response.games) {
					currentGame = new Game(responseGame.appid, responseGame.name, responseGame.playtime_forever, [], responseGame.img_logo_url);
					currentGame.iconURL = responseGame.img_icon_url;
					currentGame.playtime2Weeks = responseGame.playtime_2weeks;
					responseGames.set(currentGame.appid, currentGame);
				}

				this.historyFile.addResponseGames(responseGames);
				this.tryUpdateData();

				jetpack.write(jsonPath + "response.json", response.response);
			}
		};
		xhttp.open("GET", url);
		xhttp.send();
	}

	private tryUpdateData() {
		if (this.historyFile.isReady()) {
			if (!this.historyFile.games)
				throw new Error("Something went wrong getting games data!"); // Should be impossible

			let file = jetpack.read(jsonPath + "Play History.json", "json");

			if (file) {
				migrateData(file);

				let oldHistory = new HistoryFile(parseGamesArray(file.games), file.version, file.lastRun);
				if (!oldHistory.games)
					throw new Error("\"Play History.json\" was formatted incorrectly.");

				oldHistory.copyLastPlayedFrom(this.historyFile);

				console.log("Current File: ");
				console.log(this.historyFile);
				this.historyFile.games = updateGameHistory(this.historyFile.games, oldHistory.games, oldHistory.lastRun);
				this.historyFile.lastRun = oldHistory.lastRun;
				console.log("After update: ");
				console.log(this.historyFile);
			} else {
				this.historyFile.games = initializeGames(this.historyFile.games);
			}

			this.eventBus.$emit("games-updated", this.historyFile.games);

			jetpack.write(jsonPath + "Play History.json", this.historyFile.getWriteableObject());
		}
	}
}

function parseGamesArray(games): GameMap {
	let toReturn: GameMap = new Map<number, Game>();

	let gamesArr = deserializeArray(Game, JSON.stringify(games));

	for (let game of gamesArr) {
		toReturn.set(game.appid, game);
	}

	return toReturn;
}

function updateGameHistory(newGamesData: GameMap, oldGamesData: GameMap, lastRun: string): GameMap {
	console.log("Updating data");

	// update stuff
	// if it finds an unplayed game, it should update the only date there to the current date

	let newGames = Array.from(newGamesData.values()).filter( game => {
		return !oldGamesData.has(game.appid);
	});

	newGames.forEach(newGame => {
		console.log("Found a new game: " + newGame.name);
		let oldGame = initGame(newGame);
		oldGame.setZero(lastRun);
		gameUpdateLogic(oldGame, newGame, lastRun, true);
		oldGamesData.set(oldGame.appid, oldGame);
	});

	//First check for new games by looking for differences between the existing data and the just-retrieved data
	/* const existingGameIDs: number[] = [];
	for (let game of oldGamesData) {
		existingGameIDs.push(game.appid);
	} */

	/* const responseGameIDs: number[] = [];
	for (let game of newGamesData) {
		responseGameIDs.push(game.appid);
	} */

	/* const newGameIDs = responseGameIDs.filter( el => {
		return !existingGameIDs.includes(el);
	});

	// Then add the new games to the existing games file
	let newGame: Game;
	for (let newGameID of newGameIDs) {
		newGame = newGamesData.get(newGameID);
	}

	for (let gameID of newGameIDs) {
		for (let game of newGamesData) {
			if (game.appid === gameID) {
				console.log("Found a new game: " + game.name);
				let oldGame = initGame(game);
				oldGame.setZero(lastRun);
				gameUpdateLogic(oldGame, game, lastRun, true);
				oldGamesData.push(oldGame);
			}
		}
	}*/

	/*for (let oldGame of oldGamesData) {
		for (let responseGame of newGamesData) {
			if (oldGame.appid === responseGame.appid) { // If we're comparing the same game
				gameUpdateLogic(oldGame, responseGame, oldGame.playtimeHistory[oldGame.playtimeHistory.length - 1].date, false);
			}
		}
	}*/
	let responseGame: Game | undefined;
	oldGamesData.forEach( (oldGame, appid) => {
		responseGame = newGamesData.get(appid);
		if (responseGame === undefined) {
			if (oldGame.keep === undefined || !oldGame.keep) {
				let response = dialog.showMessageBox({ type: "question", buttons: ["Yes", "No"], title: "Question",
														message: oldGame.name + " has been removed from Steam. \n" +
																"Would you like to keep its data anyway?"});
				if (response === 0) {
					oldGame.keep = true;
					gameUpdateLogic(oldGame, oldGame, lastRun, false);
				} else { // response === 1
					oldGamesData.delete(appid);
				}
			}
		} else {
			gameUpdateLogic(oldGame, responseGame, lastRun, false);
		}
	});
	return oldGamesData;
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

	oldGame.totalPlaytime = responseGame.totalPlaytime;
}

function determineChunkage(oldGame: Game, responseGame: Game, mostRecentDate: string, diff: number) { // May or may not support updates mid-game
	let prePlay = subMinutes(lastPlayed(responseGame), diff); // Basically the time when the game would've been started had the recent playtime been in one chunk
	if (Math.abs(differenceInMinutes(prePlay, mostRecentDate)) > 5) { // If it had been over 5 minutes between when the game was last checked and it was theoretically started
		let response = dialog.showMessageBox({ type: "question", buttons: ["Yes", "No"], title: "Question",
			message: "Was the recent " + diff + " minutes of " + responseGame.name + " in one chunk?\n" +
						" (it was last played on " + lastPlayed(responseGame).toLocaleString() + ")"});
		if (response === 0) { // Yes
			// Bring the zero up to just before the game would've been started
			oldGame.setZero(prePlay);
		}
	}
}

function lastPlayed(game: Game, otherwise = new Date()): Date {
	if (game.lastPlayed !== undefined) {
		return new Date(game.lastPlayed);
	} else {
		return otherwise;
	}
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
	}
}

/* function constructNewGameData(game: Game): Game { // game is the source data for the game to be added
	let now = new Date();
	let gameData: Game;
	gameData["appid"] = game["appid"];
	gameData["name"] = game["name"];

	let playtime_forever = game["playtime_forever"];
	let playtime_2weeks = game["playtime_2weeks"];
	gameData["playtime_total"] = playtime_forever;

	gameData["playtime_history"] = []
	if (playtime_2weeks === undefined || playtime_2weeks === 0) { // Haven't played the game in at least two weeks
		gameData["playtime_history"].push(playtimeHist(lastPlayed(game).toISOString(), playtime_forever)); // Attribute all playtime to before two weeks ago
		if (playtime_forever !== 0) {
			gameData["playtime_history"].push(playtimeHist(now.toISOString(), 0));
		}
	} else { // Game's been played in the last two weeks
		let twoWeeksAgo = addDays(new Date(), -14);
		gameData["playtime_history"].push(playtimeHist(twoWeeksAgo.toISOString(), playtime_forever - playtime_2weeks)); // Time before two weeks ago
		gameData["playtime_history"].push(playtimeHist(lastPlayed(game).toISOString(), playtime_2weeks));
		gameData["playtime_history"].push(playtimeHist(now.toISOString(), 0));
	}

	gameData["img_icon_url"] = game["img_icon_url"];
	gameData["img_logo_url"] = game["img_logo_url"];

	return gameData;
} */

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
