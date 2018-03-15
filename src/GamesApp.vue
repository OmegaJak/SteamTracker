<template>
	<div>
    <input id="game_search" v-model="searchFilter" type="text" placeholder="Search Games" >
    <v-client-table class="fixed_headers" ref="table" :columns="columns" :data="tableData" :options="options" :show-pagination="false">
      <template slot="image" scope="props">
        <img :src="props.row.image" @click="showGameData(props)">
      </template>
      <template slot="playtime" scope="props">
        {{ convertPlaytime(props.row.playtime) }}
      </template>
      <template slot="lastPlayed" scope="props">
        {{ (isNaN(props.row.lastPlayed) || props.row.lastPlayed === 0) ? "-" : new Date(props.row.lastPlayed).toLocaleString() }}
      </template>
    </v-client-table>
    <div id="game_table">

    </div>
	</div>
</template>
<script lang="ts">
import { DataManager } from "./renderer";
import { PlaytimePoint, Game, GameMap } from "./Game";
import EventBus from "./EventBus";
import jetpack = require("fs-jetpack");
import { Data } from "electron";

export default {
  data() {
    return {
      searchFilter: "",
      tableData: [],
      columns: [
        "image",
        "name",
        "playtime",
        "cost",
        "costPerHr",
        "lastPlayed",
        "rating",
      ],
      options: {
        headings: {
          image: "",
          name: "Name",
          playtime: "Playtime",
          cost: "Cost",
          costPerHr: "Cost/Hr",
          lastPlayed: "Last Played",
          rating: "Rating",
        },
        sortable: ["name", "playtime", "cost", "costPerHr", "lastPlayed"],
        filterable: ["name"],
        perPage: 100000,
        debounce: 0,
        pagination: { dropdown: false },
        perPageValues: [],
      },
      props: ["data", "index"],
    };
  },
  watch: {
    searchFilter(val) {
      this.$refs.table.setFilter(val);
    },
  },
  created() {
    EventBus.$on("games-updated", response => {
      let responseGames: GameMap = response;
      responseGames.forEach( game => {
        this.tableData.push({
          appid: game.appid,
          image: "http://media.steampowered.com/steamcommunity/public/images/apps/" + game.appid + "/" + game.logoURL + ".jpg",
          name: game.name,
          playtime: game.totalPlaytime,
          cost: "",
          costPerHr: "",
          lastPlayed: game.lastPlayed ? new Date(game.lastPlayed).valueOf() : 0,
          rating: "",
        });
      });
    });
  },
  props: {
    dataManager: DataManager,
  },
  methods: {
    showGameData(props) {
      let dataMan: DataManager = this.dataManager;
      alert(dataMan.historyFile.getGameHistory(props.row.appid));
      if (dataMan.historyFile.games !== undefined)
        console.log(dataMan.historyFile.games.get(props.row.appid));

      console.log(props.row.lastPlayed);
    },
    convertPlaytime(playtime) {
      // Converts the playtime from minutes to hours and minutes
      let toReturn = "";
      if (playtime > 60) {
        toReturn += Math.floor(playtime / 60) + "h ";
      }
      toReturn += playtime % 60 + "m";

      return toReturn;
    },
  },
};
</script>

<style>
/* div#tablediv {
  overflow: auto;
  position: absolute;
  bottom: 0px;
  top: 105px;
} */

table {
  display: table;
  border-collapse: collapse;
  border-spacing: 2px;
  border-color: grey;
}

td {
  border-bottom: 1px solid #ddd;
  padding: 5px;
}

table.table-hover tr:hover {
  background-color: #ddd;
}
</style>

<style scoped>
div>>>tr {
  /* border-top: 7px solid; */
  background-color: red;
}

div {
  font-family: Helvetica;
}

input[type="text"] {
  width: 100%;
  height: 40px;
  font-size: x-large;
  border-color: lightgray;
  outline: none;
  /* border-radius: 15px; */
  border-style: solid;
  color: #737373;
  position: sticky;
  top: 64px;
  outline: 10px solid white;
}
</style>