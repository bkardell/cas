cas
===

Early prollyfill variant of Tab Atkins Cascading Attribute Sheets http://www.xanthir.com/blog/b4K_0

The Basic Idea
===
CAS is a rule based system that works like CSS, you can use it to attach/detach/change properties and listeners.
```css
/*  my.cas */

/* set the preload attribute on all video elements */
video { preload: true; } 

/* attach the showHelp function to onclick of any .helpButton child of .controls (any valid onevent works) */
.controls > helpButton:onclick {
  attach: showHelp;
}

/* !off is a special idnetifier that removes the attribute (you can use !on for boolean attrs as well) */
input.foo { disabled: !off; }
```

Use (interpreted)
===
1. Include cas - anywhere will do, it uses ParseMutationObservers (todo: link/commit)

```
<script src="../dist/cas.min.js"></script>
```

2. Add some cas either via:

```
<link type="text/x-cas" href="test.cas"></link>
```

or
```
<script type="text/x-cas">...</script>
```

3. Have fun.


Use (precompiling)
====
You can use node to precompile all .cas files in a folder:
```javascript
node precompile sample
```
This will generate a .cas.js file which you can include via normal script tag.

