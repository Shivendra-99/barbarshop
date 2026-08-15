/**
 * Central image registry. Every screen resolves imagery through this module,
 * so swapping photography is a one-line change per slot.
 *
 * Photographs generated with Viewmax (Gemini 3 Pro), resized and re-encoded to
 * WebP — 118 KB / 68 KB / 90 KB, down from ~2.8 MB each.
 */
import interior from './shop-interior.webp'
import atWork from './barber-at-work.webp'
import portrait from './barber-portrait.webp'

export const IMG_INTERIOR = interior
export const IMG_AT_WORK = atWork
export const IMG_PORTRAIT = portrait

/** Ordered pool used wherever the design cycled through its three uploads. */
export const IMGS = [IMG_INTERIOR, IMG_AT_WORK, IMG_PORTRAIT]

/** Deterministic image pick, mirroring the design's `IMGS[i % 3]`. */
export const imgAt = (i) => IMGS[i % IMGS.length]
