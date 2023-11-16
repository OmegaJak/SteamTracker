<template>
	<div>
		<!-- <button @click="updateChart()">Update</button> -->
		<!-- <select v-model="gameSelection">
			<option disabled value="">Please Select</option>
			<option v-for="choice in gameChoices" :value="choice" :key="choice.appid">{{choice.name}}</option>
		</select> -->
		<v-select ref="gameSelect" v-model="gameSelection" label="name" :options="gameChoices" @input="gameSelectionUpdated"></v-select>
		<apexchart width="100%" height="600px" type="area" :options="chartOptions" :series="series"></apexchart>
		<apexchart width="100%" height="600px" type="treemap" :options="distChartOptions" :series="distSeries"></apexchart>
	</div>
</template>

<script lang="ts">
class GameChoice {
	name: string;
	appid: number;
	lastPlayed: string | undefined;
}

import { DataManager } from "./renderer";
import EventBus from "./EventBus";
import Events from "./Events";
import { Game, GameMap } from "./Game";

export default {
	data() {
		// 312530
		return {
			chartOptions: {
				chart: {
					id: "time-area",
					height: "100%",
					width: "100%",
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
					x: new Date("2018-02-12").getTime(),
					y: 76,
				}, {
					x: new Date("2018-02-13").getTime(),
					y: 78,
				}, {
					x: new Date("2018-02-18").getTime(),
					y: 780,
				}, {
					x: new Date("2018-02-20").getTime(),
					y: 780,
				}, {
					x: new Date("2018-02-25").getTime(),
					y: 900,
				}],
			}],
			distChartOptions: {
				chart: {
					id: "dist-chart",
					events: {
						dataPointSelection: (event: any, context: any, config: any) => {
							let clickedName = context.data.twoDSeriesX[config.dataPointIndex];
							let game = this.$data.gameChoices.find((choice: any) => choice.name === clickedName);
							this.$data.gameSelection = game;

							let gameSelect: any = this.$refs.gameSelect;
							gameSelect.select(game);
							gameSelect.closeSearchOptions();
						},
					},
				},
				tooltip: {
					y: {
						formatter: (value: number, unused: any) => {
							return (Math.round(value * 100) / 100) + " Hrs";
						},
					},
				},
			},
			distSeries: [{
				data: [{
					x: "category A",
					y: 10,
				}, {
					x: "category B",
					y: 18,
				}, {
					x: "category C",
					y: 13,
				}],
			}],
			gameChoices: [
				{ name: "Duck Game", appid: 312530 },
				{ name: "Minecraft", appid: -1 },
			],
			gameSelection: {},
			hasPopulatedDistChart: false,
		};
	},
	props: {
		dataManager: DataManager,
	},
	methods: {
		gameSelectionUpdated(selection: GameChoice) {
			let dataMan: DataManager = this.dataManager;
			console.log("Currently selected:");
			console.log(selection.appid);
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
		tabChanged(newTab: string) {
			if (newTab === "graphs" && !this.$data.hasPopulatedDistChart) {
				console.log("Populating distribution chart");
				let games: GameMap | undefined = this.dataManager?.historyFile?.games;
				if (games !== undefined) {
					let sortedGames = Array.from(games.values()).sort((a, b) => {
						// sort descending
						if (a.totalPlaytime > b.totalPlaytime) {
							return -1;
						}

						if (a.totalPlaytime < b.totalPlaytime) {
							return 1;
						}

						return 0;
					});
					let chartData = new Array<{ x: string, y: number }>();
					sortedGames.forEach((game, _) => {
						if (game.totalPlaytime > 0) {
							let playtimeHours = game.totalPlaytimeHours();
							chartData.push({ x: game.name, y: playtimeHours });
						}
					});

					this.distSeries = [{ data: chartData }];
				}

				this.$data.hasPopulatedDistChart = true;
			}
		},
	},
	created() {
		EventBus.$on(Events.gamesUpdated, (response: any) => {
			let responseGames: GameMap = response;
			let gameChoices = new Array<GameChoice>();
			responseGames.forEach(game => {
				gameChoices.push({ name: game.name, appid: game.appid, lastPlayed: game.lastPlayed });
			});
			gameChoices.sort((a, b) => {
				let aLastPlayed = new Date(a.lastPlayed ?? 0).getTime();
				let bLastPlayed = new Date(b.lastPlayed ?? 0).getTime();
				return bLastPlayed - aLastPlayed;
			});

			this.gameChoices = gameChoices;
		});
	},
};
</script>

<style scoped>

</style>