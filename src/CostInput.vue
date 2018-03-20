<template>
	<input type="text" min="0" v-model="cost" @keypress="filterInputs($event)" @blur="updateCost">
</template>

<script lang="ts">
import EventBus from "./EventBus";
import Events from "./Events";

export default {
  data() {
    return {
			cost: this.data.cost,
		};
	},
	watch: {
		"data.cost"(newVal, oldVal) { // Accounts for external updating, like when sorted
			this.cost = newVal;
		},
	},
	props: ["data", "index"],
	created() {
		this.formatDollars();
	},
	methods: {
		filterInputs(event) {
			let validNum = /^(\d*\.)?\d*$/.test(event.target.value + event.key);
			if (!validNum) {
				event.preventDefault();
			}
		},
		updateCost() {
			this.formatDollars();

			// Use the setTimeout here to make the call asynchronous. When synchronous the $emit call took
			// up to 40ms, which delayed the time for the input value to format noticeably
			setTimeout(() => { EventBus.$emit(Events.costUpdated, this.data.appid, this.cost); }, 0);
		},
		formatDollars() {
      if (this.cost !== "" && this.cost !== undefined) {
				let num = Number(this.cost); // Converting to Number removes trailing zeros
				let parts = String(num).split(".");

				if (parts.length === 1 || parts[1].length < 2)
					this.cost = num.toFixed(2);
			}
		},
	},
};
</script>