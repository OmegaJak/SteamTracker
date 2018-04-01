export interface GameID {
	strid: string;
	numid: number;
}

export class IDTracker {
	gameIDs: GameID[];

	constructor(gameIDs?: GameID[]) {
		if (gameIDs !== undefined) {
			this.gameIDs = gameIDs;
		} else {
			this.gameIDs = [];
		}
	}

	/**
	 * Returns a numeric identifier corresponding to the string given.
	 * If the given string doesn't have an ID yet, a new ID is assigned and returned;
	 * @param strid The string identified to correlate a number with
	 */
	public getAppID(strid: string): number {
		let minID = 0;
		for (let gameID of this.gameIDs) {
			if (gameID.strid === strid)
				return gameID.numid;

			if (gameID.numid < minID)
				minID = gameID.numid;
		}

		// By virtue of getting here, the game isn't ID'd yet
		// So we need to create the ID
		let newID = {strid, numid: minID - 1};
		this.gameIDs.push(newID);

		return newID.numid;
	}
}
