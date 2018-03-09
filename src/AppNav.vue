<template>
	<div>
		<header>
			<button @click="$emit('update:tab','home')">Home</button>
			<button @click="$emit('update:tab','games')">Games</button>
			<button @click="$emit('update:tab','graphs')">Graphs</button>
		</header>
	</div>
</template>

<script lang="ts">
export default {
	props: {
		tab: String,
	},
};
</script>

<style scoped>
header {
    width: 100%;
    white-space: nowrap;
    top: 0px;
    left: 0;
    padding-top: 5px;
    padding-bottom: 15px;
}

div {
    position: sticky;
    top: 8px;
    outline: 8px solid white;
    background-color: white;
}

button {
    font-size: 30px;
    background: white;
    border: none;
    cursor: pointer;
    outline: none;
}
</style>