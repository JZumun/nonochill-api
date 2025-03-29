import { differenceInMinutes } from "date-fns";
import { createApi } from "unsplash-js";

const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY")!;
const unsplash = createApi({ accessKey: UNSPLASH_ACCESS_KEY });

interface Image {
  url: string;
  author: {
    name: string;
    url: string;
  };
}

interface CachedImage {
  image: Image;
  timestamp: Date;
}

async function retrieveImageFromUnsplash(): Promise<Image> {
  const result = await unsplash.photos.getRandom({
    query: "abstract",
  });

  if (result.errors) {
    throw new Error(result.errors.join("; "));
  }
  let image = result.response;
  if (!image) {
    throw new Error("Unable to download image");
  }

  if (Array.isArray(image)) {
    image = image[0];
  }

  return {
    url: image.urls.full,
    author: {
      name: image.user.name,
      url: image.user.links.html,
    },
  };
}

const IMAGE_IDX = ["image"];
async function cache(image: Image, kv: Deno.Kv) {
  await kv.set(IMAGE_IDX, {
    image,
    timestamp: new Date(),
  });
}

async function retrieveFromCache(kv: Deno.Kv) {
  return await kv.get<CachedImage>(IMAGE_IDX);
}

export default async function retrieveImage(kv: Deno.Kv) {
  const cachedImage = await retrieveFromCache(kv);

  if (cachedImage && cachedImage.value) {
    const { image, timestamp } = cachedImage.value;
    if (differenceInMinutes(new Date(), timestamp) < 5) {
      console.log("returning cached image");
      return image;
    }
  }

  console.log("retrieving new image");
  const image = await retrieveImageFromUnsplash();
  await cache(image, kv);
  return image;
}
