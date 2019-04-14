# Painting with pixels

```sh
npm i
npm start
```

The server starts on [localhost:1234](http://localhost:1234) by default. The presenter view is available at [?tablet](http://localhost:1234?tablet).

This is the repo for a talk first delivered at React Amsterdam, 2019.

This here master branch contains the stroke data files I created on stage during the talk.

It's best experienced with an iPad and pencil, though you can also draw with the mouse/trackpad.

Non-stylus touch events are ignored by default. You can change this by [removing this line of code](./record-stroke#43).

This is a very raw dump of a complex app built with conference-driven-development. Gotta say, the code quality is all pretty dire.

On the iPad, the app looks and draws the best if you add it to the homescreen. However, it also needs to be restarted a lot, and that's more annoying if it's a homescreen PWA, so idk. Use your best judgment.

## FAQ

### It seems to be a bit janky
oh yeah

### What does all this code in the parcel extension do?
well it was going to be a whole! complete! realtime! database! sortof! thing!

then i ran out of time and commented out about half of it

so basically: good question.

but mostly, it saves stroke data to files, and then serves that data, and also syncs json objects.

Oh, and it can serve files out of the source tree because I needed that and I had a server lying around.

### I'd like to file an issue
wow, so would i.

### Sometimes it doesn't seem to record stroke data
it actually *always* records stroke data, that's one thing that seems pretty reliable.

what's not reliable is whether that data displays. in particular, if you delete the data files and then go to a slide and start drawing, you will usually not see what you're doing.

no, i don't know why. anyway, the stroke data isn't empty anymore, so if you reload the page you'll see what you drew and be able to draw more and yes i actually live demo'd this mostly without issue it was like a miracle

### How do i clear the canvas?
1. delete the data file for that slide. They're all in `.data`
2. reload the app, go to the slide. draw a little. you probably won't see anything.
3. reload the app again. now you should see what you drew, and be able to draw again.

very. janky.

### Do you accept pull requests to fix things
yes!
