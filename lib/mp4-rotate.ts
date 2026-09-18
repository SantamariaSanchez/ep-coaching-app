// Retour direct 2026-09-18 : "ça me dit que c'est en paysage alors que mon
// tel est à la verticale" — après avoir épuisé tout ce qui se règle côté
// `getUserMedia` (aspectRatio, applyConstraints, resizeMode — voir
// Teleprompter.tsx), la vraie cause probable est que le pipeline caméra de
// ce téléphone livre à MediaRecorder les frames BRUTES du capteur (souvent
// monté à l'horizontale même téléphone tenu à la verticale), sans jamais
// appliquer de rotation — ni au niveau du flux, ni à l'enregistrement.
// Aucune contrainte `getUserMedia` ne peut corriger ça : le problème est en
// aval de la caméra, à l'encodage.
//
// C'est exactement ce que fait une vraie appli caméra native pour le même
// problème : elle encode les frames du capteur telles quelles (paysage) et
// écrit une MATRICE DE ROTATION dans le conteneur du fichier (la boîte MP4
// `tkhd`, dans `moov > trak`) qui dit aux lecteurs "affiche ceci tourné de
// 90°". `MediaRecorder` (l'API web) n'a pas d'équivalent du
// `setOrientationHint()` natif Android pour poser cette matrice — donc le
// fichier sort sans elle, d'où "paysage" alors que le téléphone était bien
// vertical.
//
// Solution : patcher directement les octets du fichier déjà enregistré pour
// y écrire cette matrice — aucun réencodage, aucun nouveau passage par
// MediaRecorder/canvas (ce qui a déjà cassé l'enregistrement sur ce
// téléphone par le passé, voir MASTERCLASS.md Axe EM). Juste une
// modification de métadonnées, aussi fiable qu'une appli caméra native.
//
// Sans savoir à l'avance dans quel sens le capteur de CE téléphone est monté
// (90° ou 270°, aucune API web n'exp ose cette info), impossible de deviner
// la bonne rotation à l'aveugle une fois de plus — Teleprompter.tsx propose
// donc un aperçu tourné, confirmé visuellement par la personne, plutôt
// qu'une nouvelle hypothèse non vérifiée.

// Matrices de transformation standard ISO/IEC 14496-12 (tkhd, 9 valeurs
// 16.16 fixed-point pour les 6 premières, 2.30 pour les 3 dernières) —
// les mêmes valeurs qu'écrit une appli caméra Android native.
const ROTATION_MATRICES: Record<0 | 90 | 180 | 270, number[]> = {
  0: [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000],
  90: [0, 0x00010000, 0, 0xffff0000, 0, 0, 0, 0, 0x40000000],
  180: [0xffff0000, 0, 0, 0, 0xffff0000, 0, 0, 0, 0x40000000],
  270: [0, 0xffff0000, 0, 0x00010000, 0, 0, 0, 0, 0x40000000],
};

interface BoxRef {
  start: number;
  size: number;
  headerSize: number;
}

// Parcourt les boîtes MP4 (size uint32 + type 4 lettres, éventuellement
// taille étendue 64 bits) entre `start` et `end`, renvoie la première du
// type demandé. Renvoie `null` sans lever d'exception sur une structure
// inattendue — mieux vaut ne rien changer qu'abîmer le fichier.
function findBox(view: DataView, start: number, end: number, type: string): BoxRef | null {
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const high = view.getUint32(offset + 8);
      const low = view.getUint32(offset + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < 8 || offset + size > end) break;
    const boxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );
    if (boxType === type) return { start: offset, size, headerSize };
    offset += size;
  }
  return null;
}

/**
 * Pose une matrice de rotation d'affichage dans le(s) `tkhd` vidéo d'un
 * fichier MP4, sans toucher aux pixels/à l'audio. Renvoie le blob
 * d'origine, inchangé, si la structure ne ressemble pas à un MP4 valide
 * (ex. webm) ou si aucune piste vidéo n'est trouvée — jamais d'exception,
 * jamais de fichier corrompu en sortie.
 */
export async function patchMp4Rotation(blob: Blob, degrees: 0 | 90 | 180 | 270): Promise<Blob> {
  let buffer: ArrayBuffer;
  try {
    buffer = await blob.arrayBuffer();
  } catch {
    return blob;
  }
  const end = buffer.byteLength;
  const view = new DataView(buffer);

  const moov = findBox(view, 0, end, "moov");
  if (!moov) return blob;

  const moovEnd = moov.start + moov.size;
  let trakOffset = moov.start + moov.headerSize;
  let patched = false;

  while (trakOffset < moovEnd) {
    const trak = findBox(view, trakOffset, moovEnd, "trak");
    if (!trak) break;
    const trakEnd = trak.start + trak.size;

    const tkhd = findBox(view, trak.start + trak.headerSize, trakEnd, "tkhd");
    if (tkhd) {
      const payloadStart = tkhd.start + tkhd.headerSize;
      const version = view.getUint8(payloadStart);
      // Version 1 (champs 64 bits) décale tous les offsets suivants —
      // MediaRecorder n'a jamais été observé en produire, mais mieux vaut
      // s'abstenir que patcher au mauvais endroit sur une structure qu'on
      // n'a pas vérifiée.
      if (version === 0 && payloadStart + 84 <= trakEnd) {
        const widthOffset = payloadStart + 76;
        const heightOffset = payloadStart + 80;
        const width = view.getUint32(widthOffset);
        const height = view.getUint32(heightOffset);
        // Une piste audio a toujours width=height=0 en tkhd — seule la
        // piste vidéo (dimensions non nulles) doit recevoir la rotation.
        if (width > 0 && height > 0) {
          const matrixOffset = payloadStart + 40;
          const matrix = ROTATION_MATRICES[degrees];
          for (let i = 0; i < 9; i++) {
            view.setInt32(matrixOffset + i * 4, matrix[i] | 0);
          }
          patched = true;
        }
      }
    }
    trakOffset = trakEnd;
  }

  if (!patched) return blob;
  return new Blob([buffer], { type: blob.type });
}
