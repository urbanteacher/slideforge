# Artwork layers

Open **Layers** at the lower-left of the editing canvas. This is available on
existing slides; selecting a campaign composition is not required.

Add a rectangle, circle or image. Select its row to rename it, hide it, lock it,
change its size/position, rotate it or adjust opacity. Images accept an asset
path, URL or upload; choose Fit whole image or Fill and crop. Width and height
are independent, so a circle can also become an ellipse.

Choose **Behind content** or **In front of content**, then Bring forward or
Send backward to change order inside that group. The list displays the front
item first. An unlocked visible selection has a Move handle on the canvas.
Drag it to position the artwork; Escape cancels. Position fields provide a
keyboard alternative. Changes use normal Undo and saving.

The theme's existing artwork is a **locked group**, including CSS decoration.
You can select it in the panel, but cannot yet move, hide or edit its individual
pieces. Slide text, charts and cards remain managed by their layout rather than
becoming freely positioned artwork. New background artwork sits above the
existing theme decoration and below content; foreground artwork sits above
content. Slide logos and page numbers stay above these groups.

Artwork is decorative, not a replacement for accessible slide content. Its
position and size are percentages of the slide, and it clips at the slide edge.
Different aspect ratios retain the percentages; the artwork does not rearrange
text. Opaque content panels may cover background artwork. Use the foreground
group where overlap is intentional, and review readability afterwards.

Artwork is saved as typed `slide.artwork` objects, separate from `slide.design`.
Imports validate shape kinds, URLs, colour, numeric bounds and unique IDs, with
up to 40 artwork objects per slide. Uploads are limited to 3.5 MB each and are
stored in the deck. Empty/hidden artwork creates no visible render layers.
Existing slides without artwork keep their original rendering path. Shared
rendering includes artwork but never editor controls; this covers the app's
presentation, review and print surfaces. Export formats that do not use the
shared HTML renderer require their own artwork support.
