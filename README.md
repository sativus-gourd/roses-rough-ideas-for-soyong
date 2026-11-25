# ROSES, cyber layer (reference build)

Soyong's week 6 release with a layer of cyberpunk effects on top, as a reference to rebuild from. None of the gallery, audio or overlay logic changed: `index.html` gains three tags at the end of `<head>` (plus a noindex tag, so this preview copy stays out of search results), and everything else lives in `assets/cyber/`.

## Looking at it

- Open it from GitHub Pages or any local server. Opened straight from the folder, the browser won't let the page read image pixels, so three effects fall back: the voxel lock-on becomes a tilt, holograms become plain additive light, and the credits rose stays a photograph.
- Add `?lab` to the URL for a panel that switches every effect between its variants, fires the timed events on demand and copies a link with the current settings. The `` ` `` key hides it.
- Add `?cyber=off` to see the week 6 release without the layer.

## The idea

Cement and signal. The collage, the roots and the grain are cement: material, slow, earthy. The static, the holograms, the pixels and the burns are signal. The two trade places with the song: quiet passages settle into cement, loud ones push into signal. Signal events land half a beat late (plus 20 to 60 ms) so they read as artefacts, like the burn flashes in the video.

Misregistration runs one way across the whole site: red shifts left, cyan shifts right. Colours come from the Street register: void `#0A0807`, flash `#FFFFFF`, cyan-pale `#93D7F3`, signal `#E9393E`, oxblood `#831C1F`.

## Effects

Defaults first; the other variants are in the lab panel.

| Effect | When | Default | Variants |
|---|---|---|---|
| Opening static | the black around ROSES | Dead channel: analog snow, slightly stretched sideways like a real broadcast, cut cleanly around the letters and roots as they grow. The pointer, invisible on the opening, shows up as interference, and the channel surges every few seconds. The grain is sized to whole device pixels, so it stays even on any screen. | chroma (red and cyan flecks), cement (warm, coarse, 12 fps), off |
| Entry | click, Enter or Space on ROSES | Tune-in: the channel surges and tears while the roots withdraw, then the collage opens out of a horizontal beam, with a short static hiss under the music. | fade (original), hiss off |
| Hover re-render | every hover burst, keyboard focus, the mobile scan band | The film treatment arrives through 26, 13, 7 and 3.5 px frames before going sharp. | off |
| Lock-on | rest the cursor 0.6 s on a photo; first tap on phones | Voxel: registration marks snap to the corners and the photo lifts into a relief of pixel blocks, brighter pixels standing further out, tilting under the cursor. Block sides catch cyan light on the right, red on the left. | tilt (CSS 3D with a sheen), off |
| Holograms | louder passages of the song | A photo projects a hologram of itself: a beam climbs out of it and the picture resolves above it in three layers that drift with parallax. Rest on one and it sharpens and turns to you; click to open its photo. | always, off. Light: mercury (cyan glass), duotone (red ghost behind), joi (full colour) |
| Photo open | click a photo | Projector: a beam snaps open into the photo, the red and cyan split and three slices settle into the clean image. Closing collapses it to a line. | voxel (resolves from big pixels), joi (flickers in), fade (original) |
| Ambient | the whole gallery | Grain sits over the collage (cement); scanlines and a slow rolling hum bar come in with the louder passages (signal). | cement (grain only), off |
| Signal burns | off the beat, roughly every 5 to 16 s depending on loudness | A scanner pass, a tile tearing, a duotone band, the vertical hold slipping. | frequent, off |
| Edge streaks | cursor in the left or right edge zone (the 3× drift) | Streaks with a red hairline on the left, cyan on the right. | off |
| Cursor | | Two rings split out of the circle with speed. | off |
| Essay | | A scan line rides the panel's top edge; the empty video slot shows a dead channel until the YouTube link goes in. | off |
| Credits | | Frame-119's roses lifted off the concrete as a hologram over an emitter, with the ledge kept as a faint wireframe behind. | off |

## Files

- `assets/cyber/roses-cyber.js`: one module per effect, commented. It only observes the page: classes on `#entry`, `#introShell`, `#experience`, the overlays and the tiles, plus the stage transform.
- `assets/cyber/roses-cyber.css`: every rule scoped to `html.sg-cyber`.
- `assets/cyber/roses-pulse.js`: the soundtrack's loudness and transients at 10 values a second plus its beat grid (120 bpm), generated from `assets/audio/roses.mp3`. It needs regenerating if the master changes.

## Notes

- Cost: under 1 ms of script per frame on top of the gallery (the lab panel shows the live figure). The opening static is a single WebGL draw at half resolution; the voxel relief is one small WebGL canvas that only draws while a photo is locked.
- Reduced motion: only still textures stay (one frame of static, the grain), and photos open with the original fade.
- From the console: `SGCyber.burn('band')` (or `'hot'`, `'tiles'`, `'scan'`, `'vhold'`), `SGCyber.hologram()`, and `SGCyber.staticTune({ base: .4, px: 2 })` to try the opening static's level and grain live.
- The gallery asks for `Frame-90.jpeg` and `Frame-120.jpeg`, which aren't in `assets/images/`. The page already skips them; those two plus `assets/manifest.js` are the 404s in the console.
- GitHub's web uploader takes 100 files at a time. Added to the existing repo, only `index.html`, `README.md` and the `assets/cyber/` folder are new or changed.

SG Rhizoma Engine by Sativus Gourd, adapted from Rhizoma by Dabin Kim (CC BY-SA 4.0), loaded live as before.
