import { readdirSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';

const OOT = 'C:/Users/petit/Downloads/OOT_UI/HUD/Icons/Pause Screen';
const MM  = 'C:/Users/petit/Downloads/MM_UI';
const DEST = './public/images';

function getPngs(dir) {
  try { return readdirSync(dir).filter(f => f.endsWith('.png')).sort(); }
  catch { return []; }
}

// Pick the LARGEST PNG = most color data = colored/active version
function copyBiggest(srcDir, destPath) {
  const pngs = getPngs(srcDir);
  if (pngs.length === 0) { console.warn(`MISS: ${srcDir}`); return; }
  let bestIdx = 0, bestSize = 0;
  for (let i = 0; i < pngs.length; i++) {
    const size = statSync(join(srcDir, pngs[i])).size;
    if (size > bestSize) { bestSize = size; bestIdx = i; }
  }
  const chosen = pngs[bestIdx];
  copyFileSync(join(srcDir, chosen), destPath);
  console.log(`OK  ${destPath.replace(DEST + '/', '')} ← [biggest] ${chosen.substring(0, 35)}`);
}

// Copy by exact hash substring
function copyByHash(dir, hash, destPath) {
  const pngs = getPngs(dir);
  const f = pngs.find(p => p.includes(hash));
  if (!f) { console.warn(`HASH NOT FOUND: ${hash} in ${dir}`); return; }
  copyFileSync(join(dir, f), destPath);
  console.log(`OK  ${destPath.replace(DEST + '/', '')} ← ${f.substring(0, 35)}`);
}

// Copy by fixed index
function copyIdx(srcDir, idx, destPath) {
  const pngs = getPngs(srcDir);
  if (!pngs[idx]) { console.warn(`MISS [${idx}]: ${srcDir}`); return; }
  copyFileSync(join(srcDir, pngs[idx]), destPath);
  console.log(`OK  ${destPath.replace(DEST + '/', '')} ← [${idx}] ${pngs[idx].substring(0, 35)}`);
}

const SI = `${OOT}/Select Item`;
const EQ = `${OOT}/Equipment`;
const QS = `${OOT}/Quest Status`;
const MI = `${MM}/Items`;
const MK = `${MM}/Masks`;
const MQ = `${MM}/Pause Screen/Quest Status`;

// === Specific hash mappings (user-confirmed) ===
copyByHash(QS, '572F2CD5', `${DEST}/item/agony.png`);
copyByHash(QS, '83A826DD', `${DEST}/item/gerudocard.png`);
copyByHash(MQ, 'CF6F102B', `${DEST}/mm/mm_bomber.png`);

// === Ocarina: fixed indices (visually confirmed in previous session) ===
copyIdx(`${SI}/Ocarinas`, 1, `${DEST}/item/ocarina.png`);
copyIdx(`${SI}/Ocarinas`, 3, `${DEST}/item/fairyocarina.png`);

// === Wallets MM: 2 files; smallest = normal wallet, biggest = giant wallet ===
{
  const dir = `${MI}/Wallets`;
  const pngs = getPngs(dir);
  const sorted = pngs.map(f => ({ f, s: statSync(join(dir, f)).size })).sort((a, b) => a.s - b.s);
  copyFileSync(join(dir, sorted[0].f), `${DEST}/mm/mm_wallet.png`);
  copyFileSync(join(dir, sorted[1].f), `${DEST}/mm/mm_giantwallet.png`);
  copyFileSync(join(dir, sorted[1].f), `${DEST}/mm/mm_wallet99.png`);
  console.log(`OK  mm/mm_wallet.png ← smallest: ${sorted[0].f.substring(0, 35)}`);
  console.log(`OK  mm/mm_giantwallet.png ← biggest: ${sorted[1].f.substring(0, 35)}`);
  console.log(`OK  mm/mm_wallet99.png ← biggest: ${sorted[1].f.substring(0, 35)}`);
}

// === Title Deeds: 8 files = 4 pairs; pick biggest per pair ===
{
  const dir = `${MI}/Title Deeds`;
  const pngs = getPngs(dir);
  for (let i = 0; i < 4; i++) {
    const a = pngs[i * 2], b = pngs[i * 2 + 1];
    const sa = a ? statSync(join(dir, a)).size : 0;
    const sb = b ? statSync(join(dir, b)).size : 0;
    const chosen = sa >= sb ? a : b;
    if (!chosen) continue;
    copyFileSync(join(dir, chosen), `${DEST}/mm/mm_deed${i + 1}.png`);
    console.log(`OK  mm/mm_deed${i + 1}.png ← ${chosen.substring(0, 35)}`);
  }
}

// === Biggoron's Sword 2nd variant (giant knife = 2nd biggest) ===
{
  const dir = `${EQ}/Biggoron's Sword`;
  const pngs = getPngs(dir);
  const sorted = pngs.map(f => ({ f, s: statSync(join(dir, f)).size })).sort((a, b) => b.s - a.s);
  if (sorted[1]) {
    copyFileSync(join(dir, sorted[1].f), `${DEST}/sword/giant_knife.png`);
    console.log(`OK  sword/giant_knife.png ← 2nd biggest: ${sorted[1].f.substring(0, 35)}`);
  }
}

// === Boot variants (2nd biggest = inactive/variant) ===
for (const [folder, dest] of [
  [`${EQ}/Iron Boots`,  `${DEST}/boots/boots_iron2.png`],
  [`${EQ}/Hover Boots`, `${DEST}/boots/boots_hover2.png`],
]) {
  const pngs = getPngs(folder);
  const sorted = pngs.map(f => ({ f, s: statSync(join(folder, f)).size })).sort((a, b) => b.s - a.s);
  if (sorted[1]) {
    copyFileSync(join(folder, sorted[1].f), dest);
    console.log(`OK  ${dest.replace(DEST + '/', '')} ← 2nd biggest: ${sorted[1].f.substring(0, 35)}`);
  }
}

// === All "biggest wins" tasks ===
const tasks = [
  // MM Items
  [`${MI}/Hero's Bow`,            `${DEST}/mm/mm_bow.png`],
  [`${MI}/Arrows/Fire Arrow`,     `${DEST}/mm/mm_firearrow.png`],
  [`${MI}/Arrows/Ice Arrow`,      `${DEST}/mm/mm_icearrow.png`],
  [`${MI}/Arrows/Light Arrow`,    `${DEST}/mm/mm_lightarrow.png`],
  [`${MI}/Hookshot`,              `${DEST}/mm/mm_hookshot.png`],
  [`${MI}/Bombs`,                 `${DEST}/mm/mm_bomb.png`],
  [`${MI}/Bombchu`,               `${DEST}/mm/mm_bombchu.png`],
  [`${MI}/Lens of Truth`,         `${DEST}/mm/mm_lens.png`],
  [`${MI}/Deku Stick`,            `${DEST}/mm/mm_stick.png`],
  [`${MI}/Deku Nut`,              `${DEST}/mm/mm_nut.png`],
  [`${MI}/Magic Beans`,           `${DEST}/mm/mm_bean.png`],
  [`${MI}/Ocarina`,               `${DEST}/mm/mm_ocarina.png`],
  [`${MI}/Kokiri Sword`,          `${DEST}/mm/mm_kokiri.png`],
  [`${MI}/Razor Sword`,           `${DEST}/mm/mm_razor.png`],
  [`${MI}/Gilded Sword`,          `${DEST}/mm/mm_gilded.png`],
  [`${MI}/Fierce Deity Sword`,    `${DEST}/mm/mm_fiercedeity.png`],
  [`${MI}/Great Fairy's Sword`,   `${DEST}/mm/mm_fairysword.png`],
  [`${MI}/Hero's Shield`,         `${DEST}/mm/mm_shield.png`],
  [`${MI}/Mirror Shield`,         `${DEST}/mm/mm_mirror.png`],
  [`${MI}/Powder Keg`,            `${DEST}/mm/mm_keg.png`],
  [`${MI}/Pictograph Box`,        `${DEST}/mm/mm_box.png`],
  [`${MI}/Letter to Kafei`,       `${DEST}/mm/mm_letter.png`],
  [`${MI}/Pendant of Memories`,   `${DEST}/mm/mm_pendant.png`],
  [`${MI}/Room Key`,              `${DEST}/mm/mm_roomkey.png`],
  [`${MI}/Moon's Tear`,           `${DEST}/mm/mm_tear.png`],
  [`${MI}/Bottle Items`,          `${DEST}/mm/mm_bottle.png`],
  // MM Masks
  [`${MK}/All-Night Mask`,        `${DEST}/mm/mm_allnight.png`],
  [`${MK}/Blast Mask`,            `${DEST}/mm/mm_blast.png`],
  [`${MK}/Bremen Mask`,           `${DEST}/mm/mm_bremen.png`],
  [`${MK}/Bunny Hood`,            `${DEST}/mm/mm_bunny.png`],
  [`${MK}/Captain's Hat`,         `${DEST}/mm/mm_captain.png`],
  [`${MK}/Couple's Mask`,         `${DEST}/mm/mm_couple.png`],
  [`${MK}/Deku Mask`,             `${DEST}/mm/mm_deku.png`],
  [`${MK}/Don Gero's Mask`,       `${DEST}/mm/mm_dongero.png`],
  [`${MK}/Garo's Mask`,           `${DEST}/mm/mm_garo.png`],
  [`${MK}/Giant's Mask`,          `${DEST}/mm/mm_giant.png`],
  [`${MK}/Gibdo Mask`,            `${DEST}/mm/mm_gibdo.png`],
  [`${MK}/Goron Mask`,            `${DEST}/mm/mm_goron.png`],
  [`${MK}/Great Fairy Mask`,      `${DEST}/mm/mm_greatfairy.png`],
  [`${MK}/Kafei's Mask`,          `${DEST}/mm/mm_kafeimask.png`],
  [`${MK}/Kamaro's Mask`,         `${DEST}/mm/mm_kamaro.png`],
  [`${MK}/Keaton Mask`,           `${DEST}/mm/mm_keaton.png`],
  [`${MK}/Mask of Truth`,         `${DEST}/mm/mm_maskoftruth.png`],
  [`${MK}/Romani's Mask`,         `${DEST}/mm/mm_romanimask.png`],
  [`${MK}/Mask of Scents`,        `${DEST}/mm/mm_scents.png`],
  [`${MK}/Stone Mask`,            `${DEST}/mm/mm_stone.png`],
  [`${MK}/Troupe Leader's Mask`,  `${DEST}/mm/mm_troupe.png`],
  [`${MK}/Zora Mask`,             `${DEST}/mm/mm_zora.png`],
  [`${MK}/Odolwa's Remains`,      `${DEST}/mm/mm_odolwa.png`],
  [`${MK}/Goht's Remains`,        `${DEST}/mm/mm_goht.png`],
  [`${MK}/Gyorg's Remains`,       `${DEST}/mm/mm_gyorg.png`],
  [`${MK}/Twinmold's Remains`,    `${DEST}/mm/mm_twinmold.png`],
  [`${MK}/Fierce Deity Mask`,     `${DEST}/mask/mm_fiercedeity.png`],
  [`${MK}/Postman's Hat`,         `${DEST}/mm/mm_postman.png`],
  // OoT Items
  [`${SI}/Fairy Bow`,             `${DEST}/item/bow.png`],
  [`${SI}/Hookshot`,              `${DEST}/item/hookshot.png`],
  [`${SI}/Longshot`,              `${DEST}/item/longshot.png`],
  [`${SI}/Bombs`,                 `${DEST}/item/bomb.png`],
  [`${SI}/Bombchus`,              `${DEST}/item/bombchu.png`],
  [`${SI}/Boomerang`,             `${DEST}/item/boomerang.png`],
  [`${SI}/Fairy Slingshot`,       `${DEST}/item/slingshot.png`],
  [`${SI}/Deku Stick`,            `${DEST}/item/deku_stick.png`],
  [`${SI}/Deku Stick`,            `${DEST}/item/sticks_oot.png`],
  [`${SI}/Deku Stick`,            `${DEST}/item/stick.png`],
  [`${SI}/Deku Nut`,              `${DEST}/item/nut.png`],
  [`${SI}/Lens of Truth`,         `${DEST}/item/lens.png`],
  [`${SI}/Megaton Hammer`,        `${DEST}/item/hammer.png`],
  [`${SI}/Magic Beans`,           `${DEST}/item/bean.png`],
  [`${SI}/Magic Spells/Din's Fire`,    `${DEST}/item/din.png`],
  [`${SI}/Magic Spells/Farore's Wind`, `${DEST}/item/farore.png`],
  [`${SI}/Magic Spells/Nayru's Love`,  `${DEST}/item/nayru.png`],
  // OoT Arrows (newly added)
  [`${SI}/Arrows/Fire Arrow`,     `${DEST}/arrow/arrow_fire.png`],
  [`${SI}/Arrows/Ice Arrow`,      `${DEST}/arrow/arrow_ice.png`],
  [`${SI}/Arrows/Light Arrow`,    `${DEST}/arrow/arrow_light.png`],
  // OoT Bottle (newly added)
  [`${SI}/Bottle Items`,          `${DEST}/bottle/bottle.png`],
  // OoT Swords
  [`${EQ}/Kokiri Sword`,          `${DEST}/sword/sword1.png`],
  [`${EQ}/Master Sword`,          `${DEST}/sword/sword2.png`],
  [`${EQ}/Biggoron's Sword`,      `${DEST}/sword/sword3.png`],
  [`${EQ}/Biggoron's Sword`,      `${DEST}/sword/sword_biggoron.png`],
  [`${SI}/Broken Goron's Sword`,  `${DEST}/sword/broken_sword.png`],
  // OoT Shields
  [`${EQ}/Deku Shield`,           `${DEST}/shield/shield1.png`],
  [`${EQ}/Deku Shield`,           `${DEST}/shield/deku_shield.png`],
  [`${EQ}/Hylian Shield`,         `${DEST}/shield/shield2.png`],
  [`${EQ}/Hylian Shield`,         `${DEST}/shield/hyrule_shield.png`],
  [`${EQ}/Mirror Shield`,         `${DEST}/shield/shield3.png`],
  // OoT Boots
  [`${EQ}/Kokiri Boots`,          `${DEST}/boots/boots.png`],
  [`${EQ}/Iron Boots`,            `${DEST}/boots/boots_iron.png`],
  [`${EQ}/Hover Boots`,           `${DEST}/boots/boots_hover.png`],
  // OoT Tunics
  [`${EQ}/Tunics/Zora Tunic`,     `${DEST}/tunic/bluetunic.png`],
  [`${EQ}/Tunics/Goron Tunic`,    `${DEST}/tunic/redtunic.png`],
  // OoT Upgrades
  [`${EQ}/Goron Bracelet`,        `${DEST}/upgrade/lift1.png`],
  [`${EQ}/Silver Gauntlets`,      `${DEST}/upgrade/lift2.png`],
  [`${EQ}/Golden Gauntlets`,      `${DEST}/upgrade/lift3.png`],
  [`${EQ}/Scales/Silver Scale`,   `${DEST}/upgrade/scale1.png`],
  [`${EQ}/Scales/Silver Scale`,   `${DEST}/upgrade/scale_bronze.png`],
  [`${EQ}/Scales/Golden Scale`,   `${DEST}/upgrade/scale2.png`],
  // OoT Masks
  [`${SI}/Bunny Hood`,            `${DEST}/mask/bunny.png`],
  [`${SI}/Gerudo Mask`,           `${DEST}/mask/gerudo.png`],
  [`${SI}/Keaton Mask`,           `${DEST}/mask/keaton.png`],
  [`${SI}/Spooky Mask`,           `${DEST}/mask/spooky.png`],
  [`${SI}/Mask of Truth`,         `${DEST}/mask/truth.png`],
  // OoT Trade sequence (newly added)
  [`${SI}/Cucco`,                 `${DEST}/trade/cucco.png`],
  [`${SI}/Cojiro`,                `${DEST}/trade/cojiro.png`],
  [`${SI}/Eggs`,                  `${DEST}/trade/egg.png`],
  [`${SI}/Eye Drops`,             `${DEST}/trade/eyedrops.png`],
  [`${SI}/Eyeball Frog`,          `${DEST}/trade/frog.png`],
  [`${SI}/Odd Mushroom`,          `${DEST}/trade/mushroom.png`],
  [`${SI}/Odd Potion`,            `${DEST}/trade/medicine.png`],
  [`${SI}/Poacher's Saw`,         `${DEST}/trade/saw.png`],
  [`${SI}/Prescription`,          `${DEST}/trade/perscription.png`],
  [`${SI}/Zelda's Letter`,        `${DEST}/trade/letter.png`],
];

let ok = 0, err = 0;
for (const [srcDir, dest] of tasks) {
  try { copyBiggest(srcDir, dest); ok++; }
  catch (e) { console.error(`ERR ${dest} — ${e.message}`); err++; }
}

console.log(`\nDone: ${ok} tasks, ${err} errors`);
