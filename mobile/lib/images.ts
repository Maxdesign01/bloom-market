import { Image } from "react-native";

const LOCAL_FLOWER_ASSETS: Record<string, any> = {
  "red rose bouquet": require("@/assets/products/red-rose-bouquet.jpg"),
  "sunflower bunch": require("@/assets/products/sunflower-bunch.jpg"),
  "white orchid pot": require("@/assets/products/white-orchid-pot.jpg"),
  "tulip mix": require("@/assets/products/tulip-mix.jpg"),
  "peace lily": require("@/assets/products/peace-lily.jpg"),
  "succulent trio": require("@/assets/products/succulent-trio.jpg"),
  "baby's breath jar": require("@/assets/products/babys-breath-jar.jpg"),
  "hydrangea vase": require("@/assets/products/hydrangea-vase.jpg"),
};

const LOCAL_FILENAME_ASSETS: Record<string, any> = {
  "red-rose-bouquet.jpg": require("@/assets/products/red-rose-bouquet.jpg"),
  "sunflower-bunch.jpg": require("@/assets/products/sunflower-bunch.jpg"),
  "white-orchid-pot.jpg": require("@/assets/products/white-orchid-pot.jpg"),
  "tulip-mix.jpg": require("@/assets/products/tulip-mix.jpg"),
  "peace-lily.jpg": require("@/assets/products/peace-lily.jpg"),
  "succulent-trio.jpg": require("@/assets/products/succulent-trio.jpg"),
  "babys-breath-jar.jpg": require("@/assets/products/babys-breath-jar.jpg"),
  "hydrangea-vase.jpg": require("@/assets/products/hydrangea-vase.jpg"),
};

/**
 * Resolves a product image:
 * Matches the same exact product photography as used on the web app.
 * If the image_url is a full http/https URL, it uses it directly.
 * Otherwise, matches the product filename or name against the bundled asset photos.
 */
export function resolveProductImage(
  imageUrl: string | null | undefined,
  productName: string,
): string {
  // 1. If it's a full remote URL (http/https), use it
  if (
    imageUrl &&
    (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
  ) {
    return imageUrl;
  }

  // 2. Match by filename from product.image_url (e.g. /products/red-rose-bouquet.jpg)
  if (imageUrl) {
    const filename = imageUrl.split("/").pop()?.toLowerCase();
    if (filename && LOCAL_FILENAME_ASSETS[filename]) {
      const asset = Image.resolveAssetSource(LOCAL_FILENAME_ASSETS[filename]);
      if (asset?.uri) return asset.uri;
    }
  }

  // 3. Match by flower name (e.g. "Red Rose Bouquet")
  const key = (productName || "").trim().toLowerCase();
  if (LOCAL_FLOWER_ASSETS[key]) {
    const asset = Image.resolveAssetSource(LOCAL_FLOWER_ASSETS[key]);
    if (asset?.uri) return asset.uri;
  }

  // 4. Default fallback to Red Rose Bouquet from assets
  const fallback = Image.resolveAssetSource(
    LOCAL_FLOWER_ASSETS["red rose bouquet"],
  );
  return fallback?.uri || "";
}
