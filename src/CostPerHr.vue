<template>
	<div> {{ format(getCostPerHr(this.cost, this.playtime)) }} </div>
</template>

<script lang="ts">
export default {
	props: ["cost", "playtime"],
	methods: {
		format(val) {
			if (val === String("-")) {
        return "-";
      } else {
        return val.toFixed(2);
      }
		},
		getCostPerHr(cost: string, playtimeMinutes: number) {
			let costAsNum = (cost === "" || cost === undefined) ? 0 : Number(cost);
			if (playtimeMinutes === 0)
				return "-";
			return costAsNum / (playtimeMinutes / 60); // Rounds to 3 decimals (sorta poorly)
		},
	},
};
</script>