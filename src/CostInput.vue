<template>
	<input type="text" min="0" v-model="cost" @keypress="filterInputs($event)" @blur="formatDollars">
</template>

<script lang="ts">
export default {
  data() {
    return {
			cost: 7.50,
		};
	},
	methods: {
		filterInputs(event) {
			let validNum = /^(\d*\.)?\d*$/.test(event.target.value + event.key);
			if (!validNum) {
				event.preventDefault();
			}
		},
		formatDollars() {
      if (this.cost !== "") {
				let num = Number(this.cost);

				this.cost = num.toFixed(2);
      }
	},
};
</script>