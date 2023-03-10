<template>
	<div>
		<!-- <button @click="updateChart()">Update</button> -->
		<!-- <select v-model="gameSelection">
			<option disabled value="">Please Select</option>
			<option v-for="choice in gameChoices" :value="choice" :key="choice.appid">{{choice.name}}</option>
		</select> -->
		<v-select v-model="gameSelection" label="name" :options="gameChoices" @input="gameSelectionUpdated"></v-select>
		<apexchart width="800px" height="600px" type="area" :options="chartOptions" :series="series"></apexchart>
	</div>
</template>

<script lang="ts">
class GameChoice {
	name: string;
	appid: number;
}

import { DataManager } from "./renderer";
import EventBus from "./EventBus";
import Events from "./Events";
import { GameMap } from './Game';

export default {
	data() {
		// 312530
		return {
			chartOptions: {
				chart: {
					id: "time-area",
					height: "100%",
					width: "100%"
				},
				xaxis: {
					type: "datetime",
					title: {
						text: "Date",
					},
				},
				yaxis: {
					title: {
						text: "Cumulative Playtime (hrs.)",
					},
					labels: {
						formatter: (v: number) => v.toFixed(1),
					},
					min: 0,
					forceNiceScale: true,
					tickAmount: 10,
				},
				stroke: {
					curve: "straight",
				},
				dataLabels: {
					enabled: false,
				},
				title: {
					text: "{{Game}} Playtime",
				}
			},
			series: [{
				data: [{
					x: new Date('2018-02-12').getTime(),
					y: 76,
				}, {
					x: new Date('2018-02-13').getTime(),
					y: 78,
				}, {
					x: new Date('2018-02-18').getTime(),
					y: 780,
				}, {
					x: new Date('2018-02-20').getTime(),
					y: 780,
				}, {
					x: new Date('2018-02-25').getTime(),
					y: 900,
				}],
			}],
			gameChoices: [
				{ name: "Duck Game", appid: 312530 },
				{ name: "Minecraft", appid: -1 },
			],
			gameSelection: {},
		}
	},
	props: {
		dataManager: DataManager,
	},
	methods: {
		gameSelectionUpdated(selection: GameChoice) {
			let dataMan: DataManager = this.dataManager;
			console.log("Currently selected:");
			console.log(selection.appid);

			dataMan?.historyFile ?.getAllPlaytimeHistoryCsv();

			let history = dataMan?.historyFile?.games?.get(selection.appid)?.playtimeHistory;
			if (history !== undefined) {
				let chartData = new Array<{ x: number, y: number }>();
				let cumulativePlaytimeHrs = 0;
				for (const playtimePoint of history) {
					cumulativePlaytimeHrs += playtimePoint.playtime / 60.0;
					try {
						chartData.push({x: playtimePoint.date.getTime(), y: cumulativePlaytimeHrs});
					} catch (e) {
						console.error(e);
						console.error("Had a problem with point:");
						console.log(playtimePoint);
						break;
					}
				}

				this.series = [{ data: chartData }];
				this.chartOptions = { title: { text: `Playtime - ${selection.name}` } };
			}
		},
	},
	created() {
		EventBus.$on(Events.gamesUpdated, (response: any) => {
			let responseGames: GameMap = response;
			let gameChoices = new Array<GameChoice>();
			responseGames.forEach(game => {
				gameChoices.push({ name: game.name, appid: game.appid });
			});

			this.gameChoices = gameChoices;
		});
	}
};
</script>

<style scoped>

</style>