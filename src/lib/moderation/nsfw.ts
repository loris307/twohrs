import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";
import sharp from "sharp";
import { NSFW_THRESHOLDS } from "@/lib/constants";

// Singleton model reference
let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

function getModel(): Promise<nsfwjs.NSFWJS> {
  if (!modelPromise) {
    tf.enableProdMode();
    // Uses nsfwjs default MobileNetV2 model (hosted by the library)
    modelPromise = nsfwjs.load();
  }
  return modelPromise;
}

export type NsfwResult = {
  isNsfw: boolean;
  reason: string | null;
  scores: Record<string, number>;
};

/**
 * Classify an image buffer for NSFW content.
 * Uses sharp for decoding+resizing, then creates a tf.tensor3d.
 */
export async function classifyImage(imageBuffer: Buffer): Promise<NsfwResult> {
  const model = await getModel();

  // Decode any format, strip alpha, resize to 224x224, get raw RGB pixels
  const { data, info } = await sharp(imageBuffer)
    .resize(224, 224, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Int32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    pixels[i] = data[i];
  }
  const imageTensor = tf.tensor3d(
    pixels,
    [info.height, info.width, info.channels],
    "int32"
  );

  try {
    const predictions = await model.classify(imageTensor);

    const scores: Record<string, number> = {};
    for (const pred of predictions) {
      scores[pred.className] = pred.probability;
    }

    for (const [className, threshold] of Object.entries(NSFW_THRESHOLDS)) {
      if ((scores[className] ?? 0) > threshold) {
        return {
          isNsfw: true,
          reason: className,
          scores,
        };
      }
    }

    return { isNsfw: false, reason: null, scores };
  } finally {
    imageTensor.dispose();
  }
}
