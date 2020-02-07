# Svelte QuickSearch Bar with FuzzySearch

## Example basic usage


```
<QuickSearchBar {options} on:pick={onPick} keys={['label', 'link']} />
```

## Example advanced usage with slots to replace parts


```
<QuickSearchBar {options} {inputEl} bind:value hidden={false} on:pick={onPick} keys={['label', 'link']}>
  <span slot="input">
    <input type="text" bind:value bind:this={inputEl} />
  </span>
  <span slot="item" let:option>
    {@html option.html.label}
    <span class="secondary">
      {@html option.html.link}
    </span>
  </span>
</QuickSearchBar>
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
