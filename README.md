dA Notifier
===========

DeviantArt Message Notifier (2010-2021) was an extension for interfacing with DeviantArt's message center for easy access to new messages in the browser.

**It no longer works,** as the API it worked with was disabled on the DeviantArt side. This repository is now made public under MIT license for preservation purposes.

History
-------

Its existence started as a port of the [deviantAnywhere extension](https://www.deviantart.com/deviantanywhere) for Firefox when I was personally switching away from Firefox to Chrome as my main browser. DeviantAnywhere itself was discontinued in 2016.

Being a personal project at first, it worked remarkably well, and I made it public.

At some point it peaked at ~12k users. At the time of writing there are still ~6k active installs. A work on a Firefox version started 2017 but a public release was postponed until a serious overhaul of already ancient code that never happened.

It relied on an API called [DiFi](https://github.com/danopia/deviantart-difi/wiki), short for DeviantArt Interactive Fragmented Interface. This was essentially an AJAX-like component of their website, and it was convenient to call it instead of trying to load a page and trying to scrape it for information. But it was tightly coupled with the website UI itself - should that change, DeviantArt would have no reason to keep it operating.

In 2018, DeviantART announced a complete overhaul of their website, called Eclipse. This was a herald of the end for DiFi, but the new UI was optional until May 2020.

After the final switch, it was only a matter of time until critical parts of DiFi stop working, and that finally happened in March 2021.

Code
----

This code represents babby's first JavaScript project. 11 years later, I cringe looking at it, but back then both JS itself was quite different (ES5 was still new!) and I had much, _much_ less experience. So please approach it from this angle.

**DO NOT LOOK AT THIS CODE AS A GUIDE ON HOW TO WRITE JAVASCRIPT OR ANY BROWSER EXTENISONS.** This is old and bad code. Many things can be done better, and I never had the energy to rewrite them seriously.

There is a "build" system relying on GNU `make` of all things, but all it does is to copy the `src` folder and the required `manifest.json` to another folder, following by zipping it up into a browser-specific extension format.

Acknowledgements
----------------

I would like to thank:

* PostaL2600 for writing the original deviantAnywhere, which formed a basis of this extension.
* Chrome development team for providing decent documentation for extensions.
* Many people who helped by testing, reporting bugs and assisting in reproducing them. Some of them, especially early ones, are listed in the [credits file](src/credits.html), but inevitably some would slip through the cracks.
* DeviantArt for tolerating this unofficial leech on their internal API for so long.
* All of the users throughout the years!