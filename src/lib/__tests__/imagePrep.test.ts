import { MAX_UPLOAD_EDGE, prepareForUpload } from '../imagePrep';

// Mock the native image manipulator; we test the resize-decision logic only.
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async () => ({ uri: 'file:///resized.jpg' })),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system/legacy', () => ({ deleteAsync: jest.fn(async () => {}) }));

const { manipulateAsync } = jest.requireMock('expo-image-manipulator');

describe('prepareForUpload', () => {
  beforeEach(() => manipulateAsync.mockClear());

  it('skips resizing when the longest edge is within the cap', async () => {
    const r = await prepareForUpload('file:///a.jpg', 1600, 1200);
    expect(r).toEqual({ uri: 'file:///a.jpg', resized: false });
    expect(manipulateAsync).not.toHaveBeenCalled();
  });

  it('resizes a large landscape shot by width, at listing-grade quality', async () => {
    const r = await prepareForUpload('file:///big.jpg', 4000, 3000);
    expect(r).toEqual({ uri: 'file:///resized.jpg', resized: true });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///big.jpg',
      [{ resize: { width: MAX_UPLOAD_EDGE } }],
      expect.objectContaining({ compress: 0.9 })
    );
  });

  it('resizes a large portrait shot by height', async () => {
    await prepareForUpload('file:///tall.jpg', 3000, 4000);
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///tall.jpg',
      [{ resize: { height: MAX_UPLOAD_EDGE } }],
      expect.anything()
    );
  });
});
