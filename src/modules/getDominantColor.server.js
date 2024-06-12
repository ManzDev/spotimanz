import { cwd } from "node:process";
import { resolve } from "node:path";
import ColorThief from "colorthief";

export const getDominantColor = async (imagePath) => {
  const coverPlaylistPath = resolve(cwd() + "/public" + imagePath.replace(".webp", ".jpg"));
  // const [r, g, b] = await ColorThief.getColor(coverPlaylistPath)
  const [r, g, b] = (await ColorThief.getPalette(coverPlaylistPath))[1];
  return `rgb(${r} ${g} ${b})`;
}
