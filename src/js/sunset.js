$(() => {
  $("#uninstall").click(() => {
    console.log("Uninstalling...");
    chrome.management.uninstallSelf();
  })
});
