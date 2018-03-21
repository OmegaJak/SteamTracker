/* A file for random functions needed in different files */

/**
 * Formats an input cost into a standard numerical format with at least two decimal precision
 * @param cost A string representing the numerical cost to be formatted
 */
export function formatDollars(cost: string) {
	if (cost !== "" && cost !== undefined) {
		let num = Number(cost); // Converting to Number removes trailing zeros
		let parts = String(num).split(".");

		if (parts.length === 1 || parts[1].length < 2)
			return num.toFixed(2);
	}
	return cost;
}
