<script>
  import QuickSearchBar from "../../src/QuickSearchBar.svelte";

  const options = [
    { label: "Index", link: "/" },
    { label: "Some exameple", link: "/part/one" },
    { label: "I want taco", link: "/doritos" },
    { label: "Fuzzy search even in url", link: "/search/me/plz" }
  ];

  let pick;
  let value;
  let inputEl;

  function onPick({ detail }) {
    pick = detail;
  }
</script>

<style>
  .secondary {
    font-size: 0.8em;
  }
  input {
    width: 100%;
    height: 30px;
  }
</style>

<p>Press CTRL+K</p>

<QuickSearchBar
  {options}
  {inputEl}
  bind:value
  on:pick={onPick}
  keys={['label', 'link']}>
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

<!-- <QuickSearchBar {options} on:pick={onPick} keys={['label', 'link']} /> -->

<p>{JSON.stringify(pick)}</p>
