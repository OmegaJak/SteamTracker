import { Type } from "class-transformer";
import "reflect-metadata";

export interface ScrapeData {
	appid: number;
	friendlyURL: string;
	hours_forever: string;
	hours: string;
	last_played: number;
	logo: string;
	name: string;
}

export class PlaytimePoint {
	date: string;
	playtime: number;

	constructor(date: string, playtime: number) {
		this.date = date;
		this.playtime = playtime;
	}
}

export type GameMap = Map<number, Game>;

export class Game {
	// Properties stored in JSON
	appid: number;
	name: string;
	totalPlaytime: number;
	@Type(() => PlaytimePoint)
	playtimeHistory: PlaytimePoint[];
	playtimeOffset?: number;
	lastPlayed?: string;
	spent?: number;
	fullPrice?: number;
	purchaseDate?: number;
	gift?: boolean;
	partOfBundle?: boolean;
	ignored?: boolean;
	rating?: number;
	tags?: string[];
	iconURL?: string;
	logoURL: string;
	keep?: boolean;

	// Properties not stored
	playtime2Weeks?: number;

	constructor(appid: number, name: string, totalPlaytime: number, playtimeHistory: PlaytimePoint[], logoURL: string) {
		this.appid = appid;
		this.name = name;
		this.totalPlaytime = totalPlaytime;
		this.playtimeHistory = playtimeHistory;
		this.logoURL = logoURL;
	}

	public setZero(date?: Date | string) {
		if (date === undefined)
			date = new Date();

		if (this.playtimeHistory.length === 0 || this.playtimeHistory[this.playtimeHistory.length - 1].playtime !== 0) {
			this.addHistPoint(date, 0);
		} else {
			this.playtimeHistory[this.playtimeHistory.length - 1].date = typeof date === "string" ? date : date.toISOString();
		}
	}

	public addHistPoint(date: Date | string, time: number) {
		let dateStr: string;
		if (typeof date === "string")
			dateStr = date;
		else
			dateStr = date.toISOString();

		this.playtimeHistory.push(new PlaytimePoint(dateStr, time));
	}
}
