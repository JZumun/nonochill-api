import { intToRGBA, Jimp, ResizeStrategy } from "jimp";
import type { JimpClass } from "@jimp/types";
import type { ScaleToFitOptions } from "@jimp/plugin-resize";
import quantize, { type ColorMap, type RgbPixel } from "quantize";

export type ColorHexString = `#${string}`;

const equals = (a1: RgbPixel, a2: RgbPixel) => a1.every((x, i) => a2[i] == x);
const luminance = ([r, g, b]: RgbPixel) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const toHex = (int: number) => int.toString(16).padStart(2, "0");

const intToArr: (int: number) => RgbPixel = (int) => {
  const color = intToRGBA(int);
  if (color.a < 100) {
    return [255, 255, 255];
  }
  return [color.r, color.g, color.b];
};

const arrToHex: (rgb: RgbPixel) => ColorHexString = (rgb) => {
  return `#${rgb.map(toHex).join("")}`;
};

const generateScheme = (image: JimpClass, max: number) => {
  const x = image.bitmap.width;
  const y = image.bitmap.height;
  const colors = [];
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      colors.push(intToArr(image.getPixelColor(i, j)));
    }
  }
  return quantize(colors, max);
};

const padArray = <T>(arr: T[], dif: number, cb: () => T) => {
  for (let i = 0; i < Math.floor(dif / 2); i++) {
    arr.unshift(cb());
  }
  for (let i = 0; i < Math.ceil(dif / 2); i++) {
    arr.push(cb());
  }
};

const generateColorArray = (image: JimpClass, colorScheme: ColorMap) => {
  const x = image.bitmap.width;
  const y = image.bitmap.height;
  const dif = Math.abs(x - y);
  const dim = Math.max(x, y);
  const tall = y > x;

  const palette = colorScheme.palette();
  const lightest = palette.reduce((best, curr) => {
    if (luminance(best) > luminance(curr)) {
      return best;
    } else return curr;
  });
  const scheme = palette.filter((x) => !equals(x, lightest)).map(arrToHex);

  const colors: number[][] = [];

  for (let j = 0; j < y; j++) {
    colors[j] = [];
    for (let i = 0; i < x; i++) {
      const color = colorScheme.map(intToArr(image.getPixelColor(i, j)));
      colors[j][i] = scheme.indexOf(arrToHex(color)) + 1;
    }

    if (tall) {
      padArray(colors[j], dif, () => 0);
    }
  }

  if (!tall) {
    padArray(colors, dif, () => Array(dim).fill(0));
  }
  return { colors, scheme, lightest: arrToHex(lightest) };
};

async function imageToArray(
  buffer: ArrayBuffer,
  size: number,
  max = 6,
): Promise<{
  colors: number[][];
  scheme: ColorHexString[];
  lightest: ColorHexString;
}> {
  const image = await Jimp.read(buffer);
  const small = image.scaleToFit(
    {
      w: size,
      h: size,
      mode: ResizeStrategy.BILINEAR,
    } satisfies ScaleToFitOptions,
  );

  const colorScheme = generateScheme(small, max);
  if (!colorScheme) {
    throw new Error("Failed to generate color scheme");
  }

  return generateColorArray(small, colorScheme);
}

export { imageToArray };
