<template>
	<div> {{ format(this.costPerHr) }} </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
			displayValue: this.format(this.costPerHr),
		};
	},
	props: ["costPerHr"],
	methods: {
		format(val) {
			if (val === String("-")) {
        return "-";
      } else {
        return val.toFixed(2);
      }
		},
	},
}
</script>