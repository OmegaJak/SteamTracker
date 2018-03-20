enum Events {
	/**
	 * @param games A GameMap of games from a response
	 */
	gamesUpdated = "games-updated",

	/**
	 * @param appid number of game whose cost was updated\n
	 * @param cost string, new cost of game
	 */
	costUpdated = "cost-updated",
}

export default Events;
