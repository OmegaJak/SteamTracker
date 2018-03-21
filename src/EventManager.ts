import { DataManager } from "./renderer";
import Vue from "Vue";
import Events from "./Events";

export class EventManager {
	private eventBus: Vue;
	private dataManager: DataManager;

	constructor(bus: Vue, dataMan: DataManager) {
		this.eventBus = bus;
		this.dataManager = dataMan;

		this.addListeners();
	}

	private addListeners() {
		this.eventBus.$on(Events.costUpdated, this.costUpdatedHandler(this.dataManager));
	}

	private costUpdatedHandler(dataMan: DataManager) {
		return (appid: number, cost: string) => {
			if (dataMan.historyFile === undefined)
				throw new Error ("The historyFile was undefined when costUpdated was called!");

			if (dataMan.historyFile.games === undefined || dataMan.historyFile.games.get(appid) === undefined)
				throw new Error("Either the historyFile's games was undefined or " + appid + " is an invalid appid!");

			let costAsNum = (cost === "" || cost === undefined) ? undefined : Number(cost);

			if (costAsNum !== dataMan.historyFile.games.get(appid)!.spent) {
				dataMan.historyFile.games.get(appid)!.spent = costAsNum;
				dataMan.writeHistory();
			}
		};
	}
}
