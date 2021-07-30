import jimp from "jimp";
import quantize from "quantize";

const equals = (a1, a2) => a1.every((x, i) => a2[i] == x);
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const toHex = int => int.toString(16).padStart(2, "0");

const intToArr = int => {
  const color = jimp.intToRGBA(int);
  if (color.a < 100) {
    return [255, 255, 255];
  }
  return [color.r, color.g, color.b];
};

const arrToHex = rgb => {
  return "#" + rgb.map(toHex).join("");
};

const generateScheme = (image, max) => {
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

const padArray = (arr, dif, cb) => {
  for (let i = 0; i < Math.floor(dif / 2); i++) {
    arr.unshift(cb());
  }
  for (let i = 0; i < Math.ceil(dif / 2); i++) {
    arr.push(cb());
  }
};

const generateColorArray = (image, colorScheme) => {
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
  const scheme = palette.filter(x => !equals(x, lightest)).map(arrToHex);

  const colors = [];

  for (let j = 0; j < y; j++) {
    colors[j] = [];
    for (let i = 0; i < x; i++) {
      const color = colorScheme.map(intToArr(image.getPixelColor(i, j)));
      colors[j][i] = scheme.indexOf(arrToHex(color)) + 1;
    }

    if (tall) {
      padArray(colors[j], dif, _ => 0);
    }
  }

  if (!tall) {
    padArray(colors, dif, _ => Array(dim).fill(0));
  }
  return { colors, scheme, lightest: arrToHex(lightest) };
};

// returns: { colors: Array<Array<0-5>>, scheme: Array<ColorHexStrings>, lightest: ColorHexString }
/**
 *
 * @param {Buffer} buffer
 * @param {number} size
 * @param {number} max
 * @returns {{colors: number[][], scheme: string[], lightest: string}}
 */
const imageToArray = (buffer, size, max = 6) => {
  return jimp.read(buffer).then(image => {
    const orig = image.clone();
    const small = image.scaleToFit(size, size, jimp.RESIZE_BILINEAR);

    const colorScheme = generateScheme(small, max);
    return generateColorArray(small, colorScheme);
  });
};

export { imageToArray };
