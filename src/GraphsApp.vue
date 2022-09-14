<template>
	<div>
		<button @click="updateChart()">Update</button>
		<apexchart width="800px" height="800px" type="area" :options="chartOptions" :series="series"></apexchart>
	</div>
</template>

<script lang="ts">
import { DataManager } from "./renderer";

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
					type: 'datetime'
				},
				stroke: {
					curve: 'straight'
				},
				dataLabels: {
					enabled: false
				}
			},
			series: [{
				data: [{
					x: new Date('2018-02-12').getTime(),
					y: 76
				}, {
					x: new Date('2018-02-13').getTime(),
					y: 78
				}, {
					x: new Date('2018-02-18').getTime(),
					y: 780
				}, {
					x: new Date('2018-02-20').getTime(),
					y: 780
				}, {
					x: new Date('2018-02-25').getTime(),
					y: 900
				}]
			}]
		}
	},
	props: {
		dataManager: DataManager,
	},
	methods: {
		updateChart() {
			let dataMan: DataManager = this.dataManager;
			let history = dataMan?.historyFile?.games?.get(312530)?.playtimeHistory;
			if (history !== undefined) {
				let chartData = new Array<{ x: number, y: number }>();
				let cumulativePlaytime = 0;
				for (const playtimePoint of history) {
					cumulativePlaytime += playtimePoint.playtime;
					try {
						chartData.push({x: playtimePoint.date.getTime(), y: cumulativePlaytime});
					} catch (e) {
						console.error(e);
						console.error("Had a problem with point:");
						console.log(playtimePoint);
						break;
					}
				}

				this.series = [{ data: chartData }];
			}
		},
	},
};
</script>

<style scoped>

</style>