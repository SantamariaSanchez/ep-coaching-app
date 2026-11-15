import test from "node:test";
import assert from "node:assert/strict";
import { SET_VIDEO_PREFIX, setVideoPathOf } from "../../utils/corrections";

const CLIENT = "11111111-1111-1111-1111-111111111111";

test("vidéo de série : signée seulement dans le dossier du client", () => {
  assert.equal(setVideoPathOf({ client_id: CLIENT, video_path: `${SET_VIDEO_PREFIX}${CLIENT}/s1/abc.mp4` }), `${CLIENT}/s1/abc.mp4`);
  assert.equal(setVideoPathOf({ client_id: CLIENT, video_path: `${SET_VIDEO_PREFIX}22222222-2222-2222-2222-222222222222/s1/x.mp4` }), null);
  assert.equal(setVideoPathOf({ client_id: CLIENT, video_path: `${SET_VIDEO_PREFIX}${CLIENT}/../autre/x.mp4` }), null);
  assert.equal(setVideoPathOf({ client_id: null, video_path: `${SET_VIDEO_PREFIX}${CLIENT}/x.mp4` }), null);
  assert.equal(setVideoPathOf({ client_id: CLIENT, video_path: "dossier/x.mp4" }), null);
  assert.equal(setVideoPathOf({ client_id: CLIENT, video_path: null }), null);
});
