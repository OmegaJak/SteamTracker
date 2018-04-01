import { ipcRenderer } from "electron";
import { Game, GameMap, ScrapeData } from "./Game";
import { jetpack } from "fs-jetpack";
import { IDTracker, GameID } from "./IDTracker";

export interface DataSource {
	readonly srcName: string;
	getData(): Promise<GameMap>;
}

export class SteamData implements DataSource {
	readonly srcName = "Steam";

	public async getData() {
		let [scrape, response] = await Promise.all([this.getScrapeData(), this.getAPIData()]);
		return (this.combineData(scrape, response));
	}

	private async getScrapeData() {
		ipcRenderer.send("gamesScrapeRequest");
		return new Promise<ScrapeData[]>((resolve, reject) => {
			ipcRenderer.on("gamesScrapeResponse", (event, arg) => {
				console.log("Scrape response received:");
				console.log(arg);

				resolve(arg as ScrapeData[]);
			});
			setTimeout(reject, 10000); // If no scrape data has come back in 10 seconds, it probably failed
		});
	}

	private async getAPIData() {
		const fields = [
			"key=B5276CC21AB27CA56CC4374B8BD598DB",
			"steamid=76561198055435897",
			"format=json",
			"include_appinfo=1",
			"include_played_free_games=1",
		];

		const params = fields.join("&");
		const url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?" + params;

		return new Promise<GameMap>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.onload = (() => {
				if (xhr.status >= 200 && xhr.status < 300) {
					const response = JSON.parse(xhr.response);
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

					resolve(responseGames);
				} else {
					reject();
				}
			});
			xhr.open("GET", url);
			xhr.send();
		});
	}

	private combineData(scrape: ScrapeData[], response: GameMap): GameMap {
		scrape.forEach( scrapedGame => {
			let game = response.get(scrapedGame.appid);
			if (game !== undefined && scrapedGame.last_played !== undefined) {
				game.lastPlayed = new Date(scrapedGame.last_played * 1000).toISOString(); // Date takes UTC milliseconds, last_played is UTC seconds

				if (game.playtime2Weeks === null) { // Prefer the playtime_2weeks gathered from the api call over the scrape data (it's in minutes, scrape is in hours)
					let hours = Number(scrapedGame.hours) * 60; // Valve stores playtime2Weeks in a var called hours
					game.playtime2Weeks = !isNaN(hours) ? hours : undefined;
				}
				// TODO: Examine why lastPlayed is stored as a string
			}
		});

		return response;
	}
}

export class MinecraftData implements DataSource {
	location: string;
	jet: jetpack;
	idTracker: IDTracker;

	readonly srcName = "Minecraft";

	constructor(location: string, idTracker: IDTracker) {
		this.location = location;
		this.jet = (require("fs-jetpack").cwd(location));

		this.idTracker = idTracker;
	}

	public async getData() {
		let appid = this.idTracker.getAppID("Minecraft");
		let minecraft = new Game(appid, "Minecraft", 0, [], "");
		minecraft.children = await this.getChildren();
		minecraft.source = this.srcName;

		let mostRecentLastPlayed = new Date(0);
		for (let child of minecraft.children) {
			minecraft.totalPlaytime += child.totalPlaytime;
			if (child.lastPlayed !== undefined) {
				let childLastPlayed = new Date(child.lastPlayed);
				if (childLastPlayed > mostRecentLastPlayed)
					mostRecentLastPlayed = childLastPlayed;
			}
		}
		minecraft.lastPlayed = mostRecentLastPlayed.toISOString();

		let map = new Map<number, Game>();
		map.set(appid, minecraft);

		return map;
	}

	private async getChildren(): Promise<Game[]> {
		let children: Game[] = [];
		let instances = await this.jet.listAsync();
		for (let dirname of instances) {
			if (this.jet.exists(this.jet.cwd() + "/" + dirname + "/instance.cfg")) {
				let instanceCfg: string = await this.jet.readAsync(this.jet.cwd() + "/" + dirname + "/instance.cfg");
				let totalPlaytimeMatches = instanceCfg.match(/totalTimePlayed=(\d*)\n/);
				let lastPlayedMatches = instanceCfg.match(/lastLaunchTime=(\d*)\n/);

				let playtime: number = 0;
				let lastPlayed: string = "Invalid Date";
				if (totalPlaytimeMatches !== null && lastPlayedMatches !== null) {
					playtime = Number(totalPlaytimeMatches[1]) / 60;
					if (isNaN(playtime))
						playtime = 0;

					lastPlayed = (new Date(Number(lastPlayedMatches[1]))).toISOString();
				}

				let newChild = new Game(this.idTracker.getAppID(dirname), dirname, playtime, [], "");

				if (lastPlayed !== "Invalid Date")
					newChild.lastPlayed = lastPlayed;

				children.push(newChild);
			}
		}

		return children;
	}
}
