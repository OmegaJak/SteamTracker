import { jetpack } from "fs-jetpack";
import { Game } from "../Game";
import { IDTracker } from "../IDTracker";
import DataSource from "./DataSource";

export default class MinecraftData implements DataSource {
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
		let success = false;
		for (let dirname of instances) {
			let fileLocation: string = this.jet.cwd() + "/" + dirname + "/instance.cfg";
			if (this.jet.exists(fileLocation)) {
				success = true;
				let instanceCfg: string = await this.jet.readAsync(this.jet.cwd() + "/" + dirname + "/instance.cfg");
				let totalPlaytimeMatches = instanceCfg.match(/totalTimePlayed=(\d*)\n/);
				let lastPlayedMatches = instanceCfg.match(/lastLaunchTime=(\d*)\n/);

				let playtime: number = 0;
				let lastPlayed: string = "Invalid Date";
				if (totalPlaytimeMatches !== null && lastPlayedMatches !== null) {
					playtime = Math.round(Number(totalPlaytimeMatches[1]) / 60);
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

		if (!success)
			throw new Error(`No MultiMC instance.cfg file could be found inside \"${this.jet.cwd()}\"`);

		return children;
	}
}
