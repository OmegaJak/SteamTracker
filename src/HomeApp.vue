<template>
	<div>
		<div id="actions">
			<button>Update</button>
			<button>+ Add Game</button>
		</div>
		<div class="summaryBox" id="valueSummary">
			<div>
				$/Hr: {{ (totalCost / totalPlaytime).toFixed(2) }}
			</div>
			<div class="delimiter"></div>
			<div>
				Total Cost: ${{ totalCost.toFixed(2) }}
			</div>
			<div class="delimiter"></div>
			<div>
				Total Value:
			</div>
		</div>
		<div class="summaryBox" id="topSummary">
			<div>
				Total Time: {{ totalPlaytime.toFixed(1) }}h
			</div>
			<div class="delimiter"></div>
			<div>
				Most Played:
			</div>
			<div class="delimiter"></div>
			<div>
				Best Value:
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { DataManager } from "./renderer";
import EventBus from "./EventBus";
import Events from "./Events";
import { GameMap } from "./Game";

export default {
	data() {
		return {
			totalPlaytime: 0,
			totalCost: 0,
		};
	},
	props: {
		dataManager: DataManager,
	},
	created() {
		EventBus.$on(Events.gamesUpdated, (response: any) => {
			console.log("Recalculating total playtime");
			let responseGames: GameMap = response;
			let totalMinutes = 0;
			let totalCost = 0;
			responseGames.forEach(game => {
				totalMinutes += game.totalPlaytime;
				if (game.spent !== undefined) totalCost += game.spent;
			});

			let totalHours = totalMinutes / 60.0;
			this.totalPlaytime = totalHours;
			this.totalCost = totalCost;
		});
	}
};
</script>

<style scoped>
.delimiter {
	width: 1px;
	margin-top: 2px;
	margin-bottom: 2px;
	background: black;
	position: relative;
	right: 10px;
}

div.summaryBox div:not(.delimiter) {
	margin-right: auto;
	text-align: left;
}

div.summaryBox {
	border-style: solid;
	border-width: 2px;
	width: 71.6%;
	height: 100%;
	display: flex;
	margin: 20px auto 20px auto;
	/* position: relative; */
}

div#actions {
	margin-left: auto;
	margin-right: auto;
	display: flex;
	width: 80%;
}

div#actions button {
	width: 40%;
	font-size: larger;
	margin-left: auto;
	margin-right: auto;
}
</style>