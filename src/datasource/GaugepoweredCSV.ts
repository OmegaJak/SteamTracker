import DataSource from "./DataSource";
import { jetpack } from "fs-jetpack";
import { GameMap, Game } from "../Game";
import { DataManager } from "../renderer";
import { classToClass } from "class-transformer";
import Swal from "sweetalert2";

interface Possibility {
	csvGame: Game;
	storedGame: Game;
	index: number;
}

export default class GaugepoweredCSV {
	path: string;
	jet: jetpack;
	dataMan: DataManager;

	constructor(path: string, dataMan: DataManager) {
		this.path = path;
		this.jet = require("fs-jetpack");
		this.dataMan = dataMan;
	}

	public async getData() {
		let file: string = await this.jet.readAsync(this.path);
		file = file.replace(/[®™]/g, "");

		let lines: string[] = file.split("\r\n");
		let data: string[][] = [];
		for (let line of lines) {
			let matches = line.match(/((?!").*?(?=")|[^",\n]+|,.\r)/g);
			if (matches !== null) {
				if (matches.length === 6) {
					matches.push("");
				}
				if (matches[0] !== "Game") // Ignore the first line
					data.push(matches);
			}
		}

		return data;
	}

	public async updateData() {
		let data = await this.getData();
		if (this.dataMan.historyFile.games !== undefined) {
			for (let storedGame of Array.from(this.dataMan.historyFile.games.values())) {
				let id: number = NaN;
				let possibilities: Possibility[] = new Array<Possibility>();
				let success = false;

				let name = "";
				let cost: number | undefined;
				let rating: number | undefined;
				//let finished = "";
				let tags: string[] | undefined;
				for (let i = 0; i < data.length; i++) {
					name = data[i][0];
					cost = (data[i][1] !== "") ? Number(data[i][1]) : undefined;
					rating = (data[i][4] !== "0") ? Number(data[i][4]) : undefined;
					//finished = data[i][5];
					tags = (data[i][6].length > 0 && data[i][6][0] !== "") ? data[i][6].split("|") : undefined;

					let storedName = storedGame.name.replace(/[®™:\s-]/g, "").replace(/[&]/g, "and").toLowerCase();
					let newName = name.replace(/[®™:\s-]/g, "").replace(/[&]/g, "and").toLowerCase();
					let same = storedName === newName;
					let subs = same || (storedName.length !== newName.length
										&& (storedName.includes(newName) || newName.includes(storedName)));
					if (same || subs) {
						let csvGame = classToClass(storedGame);
						csvGame.name = name;
						csvGame.spent = cost;
						csvGame.rating = rating;
						csvGame.tags = tags;

						if (same) {
							id = storedGame.appid;
							success = true;

							let oldGame = this.dataMan.historyFile.games!.get(id);
							if (oldGame !== undefined) {
								csvGame.name = oldGame.name;
								updateThings(csvGame, oldGame, i, this.dataMan);
							}

							break;
						} else if (subs) {
							possibilities.push({ csvGame, storedGame, index: i });
						}
					}
				}

				if (!success) {
					if (possibilities.length === 1) {
						let question = `Are "<b>${possibilities[0].storedGame.name}</b>"(from Play History) and <b>"${possibilities[0].csvGame.name}"</b>
										(from csv) the same game? (this was the only match [Play History -> CSV])`;
						await Swal({
							html: question,
							showConfirmButton: true,
							showCancelButton: true,
							confirmButtonText: "Yes",
							cancelButtonText: "No",
							allowOutsideClick: false,
						}).then(result => {
							if (result.value) {
								confirmUpdate(possibilities[0], this.dataMan);
								success = true;
							}
						});
					} else if (possibilities.length > 1) {
						let inputOpts = new Map<string, string>();
						for (let i = 0; i < possibilities.length; i++) {
							inputOpts.set(String(i), possibilities[i].csvGame.name);
						}
						await Swal({
							title: "Game Selection",
							text: `Which of the following is the same game as "${storedGame.name}"? (from Playtime History)`,
							input: "select",
							inputOptions: inputOpts,
							inputPlaceholder: "Please select a game",
							showCancelButton: true,
							cancelButtonText: "None of these",
							allowOutsideClick: false,
						}).then(result => {
							if (result.value && result.value !== "") {
								let i = Number(result.value);
								confirmUpdate(possibilities[i], this.dataMan);
								success = true;
							}
						});
					}
				}

				if (!success)
					console.log("Could not find " + storedGame.name);
			}
		} else {
			throw new Error("historyFile games was undefined!");
		}

		// The remaining lines in this correspond to games that didn't have a found counterpart in the Play History
		if (data.length > 0) {
			let str = "The following games from the CSV didn't seem to have counterparts in Play History<pre>";
			for (let remaining of data) {
				str += remaining[0] + "<br/>";
			}
			str += "</pre>";
			Swal({
				title: "Leftovers",
				html: str,
			});
		}

		function updateThings(newGame: Game, oldGame: Game, index: number, dataMan: DataManager) {
			dataMan.updateProperties(newGame, oldGame);

			data.splice(index, 1);
		}

		function confirmUpdate(possibility: Possibility, dataMan: DataManager) {
			possibility.csvGame.name = possibility.storedGame.name;
			updateThings(possibility.csvGame, possibility.storedGame, possibility.index, dataMan);
		}
	}
}
