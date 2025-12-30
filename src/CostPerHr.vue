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
				if (val < 1) {
					let fixed = val.toFixed(3);
					let fixedAsNum = Number(fixed);
					if (fixedAsNum >= 1) {
						// We rounded up to 1
						return val.toFixed(2);
					} else if (fixedAsNum === 0) {
						// We rounded down to 0
						return "0.00";
					}
					return fixed;
				} else if (val < 1000) {
					return val.toFixed(2);
				} else {
					return val.toString();
				}
			}

			return "0.00";
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

<!-- 
I don't want to mess with the build hell that is this project to get real tests going.
So instead, copy the above format function into a playground, and copy the below into the same
playground, and the run it.

function assert_eq(left: any, right: any) {
    if (left !== right) {
        console.log("Assertion failed, left: \"" + left + "\", right:\"" + right + "\"");
    }
}

console.log("starting test run")
assert_eq(format(1.67/(1+(42/60))), "0.982") // regression test for previous bug which formatted this as 1.982
assert_eq(format(0.0000000001), "0.00")
assert_eq(format(0.00777873811581677), "0.008")
assert_eq(format(0.1234), "0.123")
assert_eq(format(0.999), "0.999")
assert_eq(format(0.99999999999), "1.00")
assert_eq(format(1.1234), "1.12")
assert_eq(format(9.99999999999), "10.00")
assert_eq(format(10.00000001), "10.00")
assert_eq(format(10.1234), "10.12")
assert_eq(format(99.1234), "99.12")
assert_eq(format(99.99), "99.99")
assert_eq(format(99.99999999999999999), "100.00")
assert_eq(format(100.1234), "100.12")
assert_eq(format(100.129), "100.13")
assert_eq(format(999.99), "999.99")
assert_eq(format(999.9999999999), "1000.00")
assert_eq(format(999.99999999999999), "1000")
assert_eq(format(4200), "4200")
assert_eq(format(12345678), "12345678")
assert_eq(format("ouiawjefs"), "0.00")
console.log("finished run")
-->