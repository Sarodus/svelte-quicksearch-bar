# Svelte QuickSearch Bar with FuzzySearch

**Open with CTRL+K**

## Installation

```
npm install --save-dev svelte-quicksearch-bar
```

## Example basic usage

[See on REPL](https://svelte.dev/repl/d219a64c734d49fc8c4d7dcdcd734e64?version=3.18.1)

```
<script>
import QuickSearchBar from "svelte-quicksearch-bar@latest";
const onPick = e => selectedOption = e.detail;
let options = [{label: "Example", link: "/"}];
let selectedOption;
</script>

<QuickSearchBar {options} on:pick={onPick} keys={['label', 'link']} />

<p>Press CTRL + K to open</p>
<p>Selected: {JSON.stringify(selectedOption)}</p>
```

## Example advanced usage with slots to replace input or item visualization

[See on REPL](https://svelte.dev/repl/9361c615fee1408e876540158bd91aec?version=3.18.1)

```
<script>
import QuickSearchBar from "svelte-quicksearch-bar@latest";
const onPick = ({detail}) => selectedOption = detail;
let options = [{label: "Example", link: "/"}];
let inputEl;
let selectedOption;
let value;
</script>

<style>
	.secondary-text {
		font-size: 0.7em;
		color: purple;
	}
	input {
		width: 100%;
	}
</style>

<QuickSearchBar {options} {inputEl} bind:value on:pick={onPick} keys={['label', 'link']}>
  <span slot="input">
    <input type="text" bind:value bind:this={inputEl} />
  </span>
  <span slot="item" let:option>
    {@html option.html.label}
    <span class="secondary-text">
      {@html option.html.link}
    </span>
  </span>
</QuickSearchBar>

<p>Press CTRL + K to open</p>
<p>Selected: {JSON.stringify(selectedOption)}</p>
```


# API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| hidden | Boolean | True | Hide or not this component
| options | List[Objects] | [{ label: "Example", link: "/" }] | List of options to display
| keys | List[String] | ["label", "link"] | Keys to search in options with fuzzysearch
| value | String | '' | Value of the current search input
| inputEl | InputElement | undefined | Used when provided an slot="input"

## Events

| Event Name | Callback | Description |
|------|------|----------|
| pick | option | Fires when the option is selected/clicked


## Development of this component
Go to example folder and run
```
npm install
npm run dev
```
