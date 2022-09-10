import { ipcRenderer } from "electron";
import { Game, GameMap, ScrapeData } from "./../Game";
import DataSource from "./DataSource";

export default class SteamData implements DataSource {
	readonly srcName = "Steam";

	public async getData() {
		let [scrape, response] = await Promise.all([this.getScrapeData(), this.getAPIData()]);
		return (this.combineData(scrape, response));
	}

	private async getScrapeData() {
		ipcRenderer.send("gamesScrapeRequest");
		return new Promise<ScrapeData[]>((resolve, reject) => {
			ipcRenderer.on("gamesScrapeResponse", (event: any, arg: ScrapeData[]) => {
				console.log("Scrape response received:");
				console.log(arg);

				resolve(arg as ScrapeData[]);
			});
			setTimeout(() => { reject("Scrape Data Timeout"); }, 10000); // If no scrape data has come back in 10 seconds, it probably failed
		});
	}

	private async getAPIData() {
		const fields = [
			"key=B5276CC21AB27CA56CC4374B8BD598DB",
			"steamid=76561198055435897",
			"format=json",
			"include_appinfo=true",
			"include_played_free_games=true",
		];

		const params = fields.join("&");
		const url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?" + params;
		console.log("GetOwnedGames Request: GET " + url);

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
						if (responseGame.img_logo_url === undefined) {
							// https://stackoverflow.com/a/54200977
							responseGame.img_logo_url = `https://steamcdn-a.akamaihd.net/steam/apps/${responseGame.appid}/header.jpg`;
						}
						currentGame = new Game(responseGame.appid, responseGame.name, responseGame.playtime_forever, [], responseGame.img_logo_url);
						currentGame.iconURL = responseGame.img_icon_url;
						currentGame.playtime2Weeks = responseGame.playtime_2weeks;
						responseGames.set(currentGame.appid, currentGame);
					}

					resolve(responseGames);
				} else {
					reject("Bad API Response");
				}
			});
			xhr.open("GET", url);
			xhr.send();

			setTimeout(() => { reject("API Query Timeout"); }, 10000);
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
			} else if (game === undefined) {
				console.log("game \"" + scrapedGame + "\" had no corresponding analogue in the API response");
			}
		});

		return response;
	}
}
