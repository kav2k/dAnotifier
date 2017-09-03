/* global MutationSummary */
(function() {
  function normalize(x) {
    const x1 = 1000 * 60 * 5; // 5 minutes
    const x2 = 1000 * 60 * 60 * 24 * 1.5; // 3 days
    const exp = -1;

    const y = (Math.pow(0.15, exp) - 1) * (x - x1) / (x2 - x1) + 1;
    if (y < 1) {
      return 1;
    } else if (y > Math.pow(0.05, exp)) {
      return 0;
    } else {
      return Math.pow(y, exp);
    }
  }

  function colorize() {
    if (!$(this).parent().data("mcbox")) { return; }

    // Color choices:
    // Gold: rgb(255, 204, 0);
    // dA: rgb(191, 206, 0);

    this.style.setProperty(
      "box-shadow",
      "inset 0px 0px 10px 5px rgba(255,204,0," +
        normalize(Date.now() - $(this).parent().data("mcbox").message.ts * 1000) +
      ")"
    );
  }

  function changeHandler(summaries) {
    summaries[0].added.forEach(function(el) { colorize.call(el); });
  }

  new MutationSummary({
    callback: changeHandler,
    queries: [{element: ".mc-ctrl", elementAttributes: "class"}]
  });

  $(".mc-ctrl").each(colorize);
})();
