<template>
	<div> {{ format(getCostPerHr(this.cost, this.playtime)) }} </div>
</template>

<script lang="ts">
export default {
	props: ["cost", "playtime"],
	methods: {
		format(val: string | number) {
			if (val === String("-")) {
        return "-";
      } else if (typeof val === "number") {
				let decimal = val - Math.floor(val); // Remove integer portion

				let intStr = String(val.toFixed(1)).split(".")[0]; // Get the integer portion
				let decimalStr: string;
				if (intStr.length > 1) {
					decimalStr = decimal.toFixed(2); // If we have at least 2 digits before ".", only show two digits after "."
				} else {
					decimalStr = decimal.toPrecision(3); // Otherwise, round based on sig figs
				}
				if (decimalStr.length > 5) { // May have gotten too many digits to the right of "."
					if (val < 1) {
						decimalStr = decimal.toFixed(4); // So if it's less than 1, reduce to 4 digits after "."
					} else {
						decimalStr = decimal.toFixed(3); // If it's over one, only do 3 digits after "."
					}
				}

				return intStr + decimalStr.substring(1); // The "." comes with the decimalStr. Substring to remove 0 before "."
      }
		},
		getCostPerHr(cost: string, playtimeMinutes: number) {
			let costAsNum = (cost === "" || cost === undefined) ? 0 : Number(cost);
			if (playtimeMinutes === 0)
				return "-";
			return costAsNum / (playtimeMinutes / 60);
		},
	},
};
</script>