import { ipcRenderer } from "electron";
import { Game, GameMap, ScrapeData } from "./../Game";
import DataSource from "./DataSource";

export default class SteamData implements DataSource {
	readonly srcName = "Steam";

	public async getData() {
		return this.getAPIData();
	}

	private async getAPIData() {
		const fields = [
			"key=PUTYOURKEYHERE",
			"steamid=PUTYOURIDHERE",
			"format=json",
			"include_appinfo=true",
			"include_played_free_games=true",
			"skip_unvetted_apps=false", // include things like OpenTTD, Caveblazers: Together
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
						if (responseGame.name == "Duck Game") {
							console.log(responseGame);
						}
						if (responseGame.img_logo_url === undefined) {
							// https://stackoverflow.com/a/54200977
							responseGame.img_logo_url = `https://steamcdn-a.akamaihd.net/steam/apps/${responseGame.appid}/header.jpg`;
						}
						currentGame = new Game(responseGame.appid, responseGame.name, responseGame.playtime_forever, [], responseGame.img_logo_url);
						if (responseGame.rtime_last_played !== undefined && responseGame.rtime_last_played !== 0) {
							currentGame.lastPlayed = new Date(responseGame.rtime_last_played * 1000).toISOString(); // Date takes UTC milliseconds, last_played is UTC seconds
						}
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
}
