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

	/**
	 * @param isFetching Bool indicating whether it's currently being updated
	 * @param message A message to be displayed when getting the data
	 */
	fetchingData = "fetching-data",
}

export default Events;
