/* Pictures the author placed on a slide, and the poses a slide gives the
 * theme's own shapes. Moved out of js/render.js — see docs/render-split.md.
 *
 * This is the smallest module of the split and the only one that installs
 * rather than returns. Its body is seven `SF.x = …` assignments and one local,
 * so a factory that returned them would have meant rewriting every one of
 * those statements — the first non-mechanical edit in a refactor whose whole
 * discipline is that code moves unchanged. It takes SF and assigns onto it
 * exactly as the renderer did, which is why it is `install` and not `create`.
 *
 * Read the prefix as the contract: `create*` is pure and hands its names back
 * for js/render.js to unpack; `install*` writes onto SF itself.
 */
export function installArtRenderer(SF, helpers) {
  const {el} = helpers;

  /* ---------------------------------------------------------- slide artwork
     The theme manifest paints the same decoration on every slide of an eligible
     type. A pose is one slide's disagreement with that: where a shape sits, how
     big it is, and whether it is there at all. Poses are per slide, so a slide
     nobody has touched still follows its theme — and still restyles when the
     theme changes. They live on slide.art, which survives normalizeSlide
     untouched because that copies the raw slide over the base.

     Keyed by the shape's first class, which is what the theme manifest names it
     (art-orbit, art-tile, art-dot). Editing the manifest's html can orphan a
     pose; an orphan is ignored rather than applied to the wrong shape. */
  function artKeyOf(node, i) {
    /* An SVG element's className is an SVGAnimatedString, so String() on it
       yields "[object SVGAnimatedString]" and the key became "[object". */
    var raw = node.className;
    if (raw && typeof raw === 'object' && 'baseVal' in raw) raw = raw.baseVal;
    var cls = String(raw || '').split(/\s+/).filter(Boolean)[0];
    return cls || 'art-' + i;
  }
  SF.artKeyOf = artKeyOf;

  /* Tags every shape with its key so the editor can find it, then applies any
     pose. Theme shapes are placed off right/bottom, so a pose that sets a
     corner has to release the other one or the shape is pinned by both. */
  SF.applyArtPoses = function (layer, poses) {
    if (!layer) return;
    Array.prototype.forEach.call(layer.children, function (node, i) {
      var key = artKeyOf(node, i);
      node.setAttribute('data-art-key', key);
      var pose = poses && poses[key];
      if (!pose) return;
      if (pose.x != null && pose.y != null) {
        node.style.left = pose.x + 'px';
        node.style.top = pose.y + 'px';
        node.style.right = 'auto';
        node.style.bottom = 'auto';
      }
      if (pose.scale != null) {
        node.style.transform = 'scale(' + pose.scale + ')';
        node.style.transformOrigin = 'top left';
      }
      /* A theme shape moves side by side-stepping its own layer, because the
         layer holds the whole set and only this shape is being brought
         forward. z-index alone would not do it: .theme-art is z-index auto, so
         its children sit in the slide's own stacking context, where a content
         pad carrying z-index 1 is already above them. The rule in
         artwork.css gives a fronted shape a z-index above that pad. */
      var side = SF.artOrder(pose, 'back');
      node.setAttribute('data-art-order', side);
      if (pose.hidden) node.style.display = 'none';
    });
  };

  /* Null rather than an empty layer when there is nothing placed: an empty
     absolutely positioned box over every slide is a hit-testing hazard for no
     reason. Coordinates are true slide pixels — callers scale the whole slide,
     so a pose means the same thing in the rail, the editor and the player. */
  /* 'back' or 'front' of the slide's content, for one artwork item.
     The defaults are what the app already did, so no existing deck moves: a
     placed picture has always painted over the words (.slide-art is z-index 2
     and content is not), and a theme's decoration has always painted under
     them. Neither was ever a choice; both are now, and both keep their answer
     when nobody has chosen. */
  SF.artOrder = function (item, fallback) {
    return item && item.order === 'back' ? 'back' : item && item.order === 'front' ? 'front' : fallback;
  };

  /* One layer per side, because the side is a paint-order question and CSS
     decides paint order between boxes, not within one. Only the layers that
     have something in them are built: an empty absolutely positioned box over
     every slide is a hit-testing hazard for no reason. */
  /* Free by coordinates, or a block on the lattice. Free is what a placed
     picture has always been and stays the default, because decoration that
     bleeds off the edge of a slide cannot be expressed as a cell range and
     should not have to be. On the lattice it is a block: it takes rows and
     columns, other blocks push away from it, and the cell decides its size.
     `order` has no meaning there — a block is beside content, not over or
     under it — so the Side control goes quiet for one. */
  SF.artPlacement = function (pic) {
    return pic && pic.place === 'lattice' ? 'lattice' : 'free';
  };
  SF.artBlockKey = function (id) { return 'picture.' + id; };
  SF.artBlockId = function (key) {
    var m = /^picture\.(.+)$/.exec(String(key || ''));
    return m ? m[1] : null;
  };

  SF.placedArtLayers = function (pictures) {
    var list = Array.isArray(pictures) ? pictures.filter(function (p) {
      return p && p.src && SF.artPlacement(p) === 'free';
    }) : [];
    var layers = {};
    list.forEach(function (pic, i) {
      var side = SF.artOrder(pic, 'front');
      var layer = layers[side] || (layers[side] = el('div', 'slide-art slide-art-' + side));
      layer.setAttribute('data-art-order', side);
      var img = el('img', 'slide-art-img');
      img.src = SF.safeMedia(pic.src);
      img.alt = String(pic.alt || '');
      img.setAttribute('data-art-pic', String(pic.id == null ? i : pic.id));
      img.setAttribute('data-art-order', side);
      if (pic.hidden) img.style.display = 'none';
      img.style.left = (pic.x || 0) + 'px';
      img.style.top = (pic.y || 0) + 'px';
      if (pic.w) img.style.width = pic.w + 'px';
      layer.appendChild(img);
    });
    /* Back first, so that within a side the array order still decides which
       picture is on top — the one ordering the app already had. */
    return ['back', 'front'].map(function (side) { return layers[side]; }).filter(Boolean);
  };
}
