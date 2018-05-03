<template>
	<input type="text" min="0" v-model="cost" @keypress="filterInputs($event)" @blur="updateCost" @paste="filterInputs($event)">
</template>

<script lang="ts">
import EventBus from "./EventBus";
import Events from "./Events";
import { formatDollars } from "./SteamTrackerLib";

export default {
  data() {
    return {
			cost: this.data.cost,
		};
	},
	watch: {
		"data.cost"(newVal: string, oldVal: string) { // Accounts for external updating, like when sorted
			this.cost = newVal;
		},
	},
	props: ["data", "index"],
	created() {
		this.format();
	},
	methods: {
		filterInputs(event: any) {
			let newValue = event.target.value;
			if (event instanceof KeyboardEvent) {
				if (event.key !== "Enter") {
					newValue += event.key;
				} else {
					this.updateCost();
				}
			} else if (event instanceof ClipboardEvent) {
				newValue += event.clipboardData.getData("text/plain");
			}

			let validNum = !isNaN(Number(newValue));
			if (!validNum) {
				event.preventDefault();
			}
		},
		updateCost() {
			this.format();

			// Use the setTimeout here to make the call asynchronous. When synchronous the $emit call took
			// up to 40ms, which delayed the time for the input value to format noticeably
			setTimeout(() => { EventBus.$emit(Events.costUpdated, this.data.appid, this.cost); }, 0);
		},
		format() {
      this.cost = formatDollars(this.cost);
		},
	},
};
</script>

<style scoped>
input[type=text] {
	width: 75%;
	font-size: inherit;
	padding: 5px 3px;
	border-radius: 4px;
	border: 1px solid #ccc;
}

input[type=text]:hover {
	border: 1px solid #799905;
}

input[type=text]:focus {
	border: 2px solid #799905;
	outline: #799905;
	padding: 4px 2px;
}
</style>