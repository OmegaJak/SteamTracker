<template>
	<div>
    <input id="game_search" v-model="searchFilter" type="text" :placeholder="searchPlaceholder" >
    <v-client-table class="fixed_headers" ref="table" :columns="columns" :data="tableData" :options="options" :show-pagination="false">
      <template slot="image" scope="props">
        <img :src="props.row.image" @click="showGameData(props)">
      </template>
      <template slot="playtime" scope="props">
        {{ convertPlaytime(props.row.playtime) }}
      </template>
      <template slot="cost" scope="props">
        <cost-input :data="props.row"></cost-input>
      </template>
      <template slot="costPerHr" scope="props">
        <cost-per-hr :cost="props.row.cost" :playtime="props.row.playtime" ref="costPerHr"></cost-per-hr>
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
import Events from "./Events";
import { formatDollars } from "./SteamTrackerLib";
// import CostInput = require("./CostInput.vue");
import jetpack = require("fs-jetpack");
import { Data } from "electron";

export default {
  data() {
    return {
      searchFilter: "",
      searchPlaceholder: "Search Games",
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
        orderBy: {
          ascending: false,
          column: "lastPlayed",
        },
        descOrderColumns: ["playtime", "cost", "lastPlayed"],
        customSorting: {
          cost: ascending => {
            return (a, b) => {
              function toNum(x) {
                return (x.cost === "" || x.cost === undefined) ? Number.NEGATIVE_INFINITY : Number(x.cost);
              }

              let numA = toNum(a);
              let numB = toNum(b);

              if (ascending)
                return numA >= numB ? 1 : -1; // 1 is a above, -1 is a below
              else
                return numA <= numB ? 1 : -1;
            };
          },
          costPerHr: ascending => {
            return (a, b) => {
              let aCost = this.$refs.costPerHr.getCostPerHr(a.cost, a.playtime);
              let bCost = this.$refs.costPerHr.getCostPerHr(b.cost, b.playtime);

              // This relies on the order the if statements are evaluated in
              // By testing "-" first, it's at the far bottom
              // Then there are 0's, then normal sorting
              if (aCost === String("-")) {
                return 1;
              } else if (bCost === String("-")) {
                return -1;
              } else if (aCost === 0) {
                return 1;
              } else if (bCost === 0) {
                return -1;
              } else {
                if (ascending)
                  return aCost >= bCost ? 1 : -1;
                else
                  return aCost <= bCost ? 1 : -1;
              }
            };
          },
        },
        // templates: {
        //   cost: CostInput,
        // },
      },
      props: ["data", "index"],
    };
  },
  components: {
    CostInput: require("./CostInput.vue"),
    CostPerHr: require("./CostPerHr.vue"),
  },
  watch: {
    searchFilter(val) {
      this.$refs.table.setFilter(val);
    },
  },
  created() {
    EventBus.$on(Events.gamesUpdated, response => {
      let responseGames: GameMap = response;
      this.tableData = [];
      responseGames.forEach( game => {
        this.tableData.push({
          appid: game.appid,
          image: "http://media.steampowered.com/steamcommunity/public/images/apps/" + game.appid + "/" + game.logoURL + ".jpg",
          name: game.name,
          playtime: game.totalPlaytime,
          cost: formatDollars(game.spent === undefined ? "" : String(game.spent)),
          costPerHr: "",
          lastPlayed: game.lastPlayed ? new Date(game.lastPlayed).valueOf() : 0,
          rating: "",
        });
      });
    });
    EventBus.$on(Events.costUpdated, (appid, cost) => {
      this.tableData.forEach(data => {
        if (data.appid === appid)
          data.cost = cost;
      });
    });
    EventBus.$on(Events.fetchingData, (isFetching, message) => {
      if (isFetching) {
        this.searchPlaceholder = message;
      } else {
        this.searchPlaceholder = "Search Games";
      }
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
      toReturn += Math.round(playtime % 60) + "m";

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

#game_search {
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