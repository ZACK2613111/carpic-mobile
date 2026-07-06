// A swappable background-removal engine. The app talks to this interface only,
// so the underlying implementation (native Vision/ML Kit, an on-device DeepLabV3
// model, or a future cloud API) can be changed without touching the editor.

export type BgRemovalResult = {
  /** file:// URI of a transparent PNG cutout. */
  uri: string;
};

export interface BgRemovalEngine {
  id: string;
  name: string;
  /** Whether this engine can run on the current device. */
  isSupported: () => Promise<boolean>;
  /** Remove the background of the image at `imageUri`, returning a cutout URI. */
  removeBackground: (imageUri: string) => Promise<BgRemovalResult>;
}
