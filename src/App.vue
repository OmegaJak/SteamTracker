<template>
	<div id="app">
		<app-nav :tab.sync="tab"></app-nav>
		<home-app v-show="tab === 'home'"></home-app>
		<games-app :dataManager="dataManager" v-show="tab === 'games'"></games-app>
		<graphs-app :dataManager="dataManager" v-show="tab === 'graphs'"></graphs-app>
	</div>
</template>

<script lang="ts">
import { DataManager } from "./renderer";

export default {
	name: "app",
	data() {
		return {
			tab: "games",
		};
	},
	components: {
		AppNav: require("./AppNav.vue"),
		HomeApp: require("./HomeApp.vue"),
		GamesApp: require("./GamesApp.vue"),
		GraphsApp: require("./GraphsApp.vue"),
	},
	mounted() {
		this.dataManager.onReady();
	},
	props: {
		dataManager: DataManager,
	},
};
</script>