# title/I'm-going-to-paint-you-something
Hi everyone.

So, the screen is black. You probably noticed. And I just have to apologize. I was just in Bangalore, India and I had a small problem getting here.

And the problem was that they repossessed my plane.

I mean, not my plane. Obviously. But THE plane. That I was going to be on. Got repossessed. Like a plane repo man came and jimmied the plane lock and flew it away.

Which... I didn't know that was a thing, but I guess it's a thing. You get too behind on your plane rent, they take your plane away. No money, no plane—no plane, no flight.

So that was a journey. KLM was kindof helpful, but mostly not. I had to fly to Mumbai, and then to London, and I was sitting on the flight wondering if they were going to Brexit while I was in the air somehow, and I would just land and it would be 1984...

Anyway.

Long story short, there's no slide here yet. Do you mind? I'm just going to... draw it right now.

* whistles *

Okay, there we go. Pretty cool, right?

Oh yeah, you have to interpret that drawing a little. See, I didn't have time to render the data so you're seeing it kindof raw. But it's easy to interpret! See, each of those dots is a stylus input event. And their color is the data we've collected. So the red component is X and the blue component is Y and the green component is force. Make sense? You can read it?

...

# title/force
Yeah, it's a bit tricky, huh. How about this, let's render the force differently. We'll make the size of the dot proportionate to the force.

# title/color
Only kindof helpful, huh? Okay how about this. There's actually a color associated with each point, we'll make the dots the right color.

# title/position
Yeah, still not very clear, huh?

How bout we move the points to their (X, Y) position on the screen. Well, kindof. We'll project them from the iPad's input coordinate system to the coordinate system of the screen.

And hey look, we have a title card! Everyone loves title cards.

So what I was just making you do was... basically *be* a vertex shader. What's a vertex shader? Well, a vertex shader is the thing I was just trying to make you BE.

Okay, better answer: In OpenGL, a vertex shader is a program that runs on every vertex and determines how that vertex will be transformed and presented. And it looks like this:

# title/vertex-shader



# title/fragment-shader
# title/litebrite-mode
# title/opacity
# title/opacity-with-code
# bleed/Draw-on-the-skyline
# bleed/Bleed-them-together
# bleed/Bleed-fragment-shader
This is Batanes talk abt Batanes...

# bleed/Batanes
These are actually three separate photos. I'm just using this selector, which you can't see, to pick which image I'm sampling colors from. So I can create this kindof glitchy watercolor collage effect.

# bleed/Batanes-out-the-oven
We've seen the shader code driving this, which is basically the brain behind this whole thing.

But like your parents and a number of world leaders, there's a lot I'm not telling you.

There's a whole bunch of machinery back here setting up the graphics context and buffers and updating what needs to be updated over there (gesture to screen) when I draw on here (scribble on tablet). But then not re-drawing everything, because that would get a bit slow, especially if I keep putting down points.

This would be a great moment to say, "And it's all in React!"

But it's not. I mean, it is, in a sense...

# bleed/The-entrypoint
Here's the entrypoint, and yep, there is indeeda call to React DOM render.

But there's this Loop component that seems important but is a bit of a mystery, and there's dollar signs going on, which are always a bit suspicious.

And overall I think this raises more questions than answers.

React is responsible for drawing all these windows and managing the state transitions between slides. But for managing the WebGL objects, I wanted to do something different.

And that's because the requirements are a bit different.

React is really good at reconciling tree strucutres. You say, "here's how I want the tree to look," and it goes and makes it look that way.

That involves performing a diff, of course, and that diff is pretty fast, but still somewhat costly.

In my experience, React does not work that well if you ask it to reconcile on every frame. And I've tried this several times. I'll build some animated thing, and be like, "I know! I should use React for this!".

And then the time will come to animate a component, and I'll say, "I know! I'll just do something this..."

# bleed/The-bad-idea
And it looks fine, right? Looks like a reasonable enough way to animate things. And it even is, for a while... until it isn't. Every time I've done something like this, at some point, I end up in this state where I've got waaaaay too many frame callbacks and too many diffs happening and it all has to happen in 16ms, and it's just... too much. Things get janky.

I want to be clear: There's so much React is great it. Tight RAF animations don't seem to be amongst them.

So my rule is: Don't React on every frame. React about once per second.

And this is a slightly nerve-wracking audience to say this to because I know there's someone out there thinking, "Bah! Of course it can work!". And I don't doubt it! I'm sure you're smart enough to make it work. I'm about equally sure that I am not.

So, if we're not doing the core rendering in React, what are we using?

We're using a spreadsheet.

# bleed/Batanes-with-inspector
Kindof.

In a spreadsheet, you have this setup where some of your cells contain raw values and other cells contain functions which can reference those values. If you change one cell, then all the cells that depend on that cell update. They don't necessarily update immediately. If you have a lot of complex functions, it may take a while for the sheet to become consistent again, but it will happen.

That's basically what's going on here. Instead of indexing our cells by row and column, we index them by key. And we compute those keys based on the props and what we call the Evaluator for the cell.

Like a React component, Evaluators take props and immediately return a value. And like React components, there's a little bit more to it than that.

Let's look at the evaluator for the Bleed cell, which is drawing the scene we're looking at right now:

# bleed/Batanes-with-inspector-and-evaluator
Evaluators take props and a reference to the actual Cell they're evaluating. If you don't provide a cell, the Evaluator returns a Pattern, which is a lot like a virtual DOM element—it includes the props, and a reference to this function, and that's it.

Unlike a component, this whole setup is designed to make it super easy to reference other cells by their patterns.

So we use this $ function—pronounced "connect"—to connect another cell. It takes a Pattern and returns that Pattern's current value. Under the hood, it creates an edge between that cell and this one, so when that value changes, this evaluator will get called again.

We connect up a few other cells. First a RecordStroke cell, which attaches event listeners to the canvas and sends the data to the server.

And then we mount a Rumination, which is an Evaluator that handles the infinite recurisve buffer-swapping shader business, just looping back the shader's output to its input, forever.

PaintStroke returns a function that reads from the node we're Recording to, and it draws sized dots for each input event. batchSize is how many points it'll draw per frame, so you can use that as kindof a crude way to change the speed that the painting redraws itself.

And then finally we return this Layer stack, the main point of which is to composite our Rumination down into the output framebuffer we were given by the player.

There's some real similarities between this and React. We do our own kind of diff: every time we re-evaluate a cell, we detach all its connections and allow the evaluator to reconnect the ones it's interested in, by calling the connect function. If a Cell ends up with no connections for more than a few ticks, we kill it, and free any resources associated with it.

But unlike React components, Cells can wire themselves into a web of dependencies. React is explicitly opposed to this. You can get refs to other components, but basically the advice is that you shouldn't. React really wants your data to flow one way: out of your components and into the page. Having data flowing every whichaway leads to chaos.

But we want chaos. That's why these recursive shader effects are so cool: they are literally chaotic. They just keep looping back onto themsevles and changing.

This one is pretty stable. Others, won't be.

# shading/blur
# shading/blur-code
# shading/afterimage
# shading/afterimage-code
# shading/illuminate
# shading/illuminate-code
# shading/life
# shading/life-code
# life/lowrez_life
# life/higher_life
# life/stacked_life
I have to tell you, this... feels really cool. It feels like the start of something. I feel like I’m creating an intergalactic civilization with every stroke and watching it float and scatter and live and die. It’s not entirely predictable and it’s a bit messy and that’s all the charm of it.

We spend so much time working on reliability. Determinism. Repeatability. React is all about this, really: data goes in, DOM nodes come out, never a miscommunication.

# life/everything_comes_alive
But we are not like that at all, really. We are reliable BECAUSE we are messy. We are interesting because we intersect with ourselves. Because we are these recursive processes that you can't really predict because we just keep evolving, ruminating, processing our own output and before you know it, we've become something very different from what we once were.

This is a brush from a different kind of art palette. From something in the cracks between coding and painting and meditation. There's a whole world in here that I can't wait to explore, a world of chaotic non-determinism.

Where the paintings paint themselves.

Where every drop of ink is a seed.

Where everything comes alive.

# life/sign_off

Thank you.

* sign *