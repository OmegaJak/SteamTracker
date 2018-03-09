<template>
	<div>
		<div id="actions">
      <button>Update</button>
      <button>+ Add Game</button>
    </div>
    <div class="summaryBox" id="valueSummary">
      <div>
        $/Hr:
      </div>
      <div class="delimiter"></div>
      <div>
        Total Cost:
      </div>
      <div class="delimiter"></div>
      <div>
        Total Value:
      </div>
    </div>
    <div class="summaryBox" id="topSummary">
      <div>
        Most Played:
      </div>
      <div class="delimiter"></div>
      <div>
        Best Value:
      </div>
    </div>
	</div>
</template>

<script lang="ts">
export default {};
</script>

<style scoped>
.delimiter {
  width: 1px;
  margin-top: 2px;
  margin-bottom: 2px;
  background: black;
  position: relative;
  right: 10px;
}

div.summaryBox div:not(.delimiter) {
  margin-right: auto;
  text-align: left;
}

div.summaryBox {
  border-style: solid;
  border-width: 2px;
  width: 71.6%;
  height: 100%;
  display: flex;
  margin: 20px auto 20px auto;
  /* position: relative; */
}

div#actions {
  margin-left: auto;
  margin-right: auto;
  display: flex;
  width: 80%;
}

div#actions button {
  width: 40%;
  font-size: larger;
  margin-left: auto;
  margin-right: auto;
}
</style>