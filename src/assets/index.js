/**
 * Central image registry — every screen resolves imagery through this module,
 * so swapping photography is a one-line change per slot.
 *
 * Generated with Viewmax (Gemini 3 Pro), resized and re-encoded to WebP.
 */
import mensInterior from './shop-interior.webp'
import mensAtWork from './barber-at-work.webp'
import mensPortrait from './barber-portrait.webp'
import unisex from './unisex-salon.webp'
import parlour from './beauty-parlour.webp'

export const IMG_MENS_INTERIOR = mensInterior
export const IMG_MENS_AT_WORK = mensAtWork
export const IMG_MENS_PORTRAIT = mensPortrait
export const IMG_UNISEX = unisex
export const IMG_PARLOUR = parlour

/** Imagery pools per salon category, cycled when seeding. */
export const CATEGORY_IMAGES = {
  mens: [mensInterior, mensAtWork, mensPortrait],
  unisex: [unisex, mensInterior, unisex],
  parlour: [parlour, unisex, parlour],
}

export const imageFor = (category, i = 0) => {
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.unisex
  return pool[i % pool.length]
}

/** Staff avatars, reused across salons. */
export const STAFF_IMAGES = [mensPortrait, mensAtWork, unisex, parlour]
