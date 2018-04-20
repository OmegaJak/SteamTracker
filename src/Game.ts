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

export class Choice {
	property: string; // The key of the property for which these new values should be ignored
	newValues: string[]; // The new values to ignore when updating

	constructor(property: string, newValues: string[]) {
		this.property = property;
		this.newValues = newValues;
	}

	public addValue(value: string) {
		if (!this.newValues.includes(value))
			this.newValues.push(value);
	}

	public includes(value: string) {
		return this.newValues.includes(value);
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
	source?: string;
	children?: Game[];
	@Type(() => Choice)
	rememberedChoices?: Choice[];

	// Properties not stored
	playtime2Weeks?: number;

	constructor(appid: number, name: string, totalPlaytime: number, playtimeHistory: PlaytimePoint[], logoURL: string) {
		this.appid = appid;
		this.name = name;
		this.totalPlaytime = totalPlaytime;
		this.playtimeHistory = playtimeHistory;
		this.logoURL = logoURL;
	}

	public prepareForWrite() {
		this.playtime2Weeks = undefined;
		if (this.children !== undefined && this.children.length === 0)
			this.children = undefined;
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

	public rememberChoice(property: string, value: string) {
		if (this.rememberedChoices === undefined) {
			this.rememberedChoices = [new Choice(property, [value])];
		} else {
			for (let choice of this.rememberedChoices) {
				if (choice.property === property) {
					choice.addValue(value);
					return;
				}
			}

			// If it gets here, the property has no previous choices
			this.rememberedChoices.push(new Choice(property, [value]));
		}
	}

	public rememberedChoice(property: string, value: string) {
		if (this.rememberedChoices === undefined)
			return false;

		let result = this.rememberedChoices.find(choice => {
			return (choice.property === property) && choice.includes(value);
		});

		return (result !== undefined);
	}
}
