cas
===

Some kinda starting poc on Tab Atkins Cascading Attribute Sheets http://www.xanthir.com/blog/b4K_0

basic idea
===
```css
/*  my.cas */

/* set the preload attribute on all video elements */
video { preload: true; } 
```

use (interpreted)
===
1. Include cas - anywhere will do, it uses ParseMutationObservers (todo: link/commit)
```html
<script src="../dist/cas.min.js"></script>
```
2. Add some cas either via:
```html
<link type="text/x-cas" href="test.cas"></link>
```
or
```html
<script type="text/x-cas">...</script>
```
3. Have fun.


use (precompiling)
====
You can use node to precompile all .cas files in a folder:
```javascript
// todo: rename that file ;)
node test sample
```
This will generate a .cas.js file which you can include via normal script tag.

