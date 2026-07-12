import { readdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const OOT = 'C:/Users/petit/Downloads/OOT_UI/HUD/Icons/Pause Screen';
const MM  = 'C:/Users/petit/Downloads/MM_UI';
const DEST = './public/images';

function getPngs(dir) {
  try { return readdirSync(dir).filter(f => f.endsWith('.png')).sort(); }
  catch { return []; }
}

function copy(srcDir, fileIndex, destPath) {
  const pngs = getPngs(srcDir);
  if (!pngs[fileIndex]) { console.warn(`MISS [${fileIndex}]: ${srcDir}`); return; }
  const src = join(srcDir, pngs[fileIndex]);
  copyFileSync(src, destPath);
  console.log(`OK  ${destPath.replace(DEST + '/', '')} ← ${pngs[fileIndex].substring(0, 40)}`);
}

const SI = `${OOT}/Select Item`;
const EQ = `${OOT}/Equipment`;
const MI = `${MM}/Items`;
const MK = `${MM}/Masks`;

const tasks = [
  // MM Items
  [`${MI}/Hero's Bow`,            0, `${DEST}/mm/mm_bow.png`],
  [`${MI}/Arrows/Fire Arrow`,     0, `${DEST}/mm/mm_firearrow.png`],
  [`${MI}/Arrows/Ice Arrow`,      0, `${DEST}/mm/mm_icearrow.png`],
  [`${MI}/Arrows/Light Arrow`,    0, `${DEST}/mm/mm_lightarrow.png`],
  [`${MI}/Hookshot`,              0, `${DEST}/mm/mm_hookshot.png`],
  [`${MI}/Bombs`,                 0, `${DEST}/mm/mm_bomb.png`],
  [`${MI}/Bombchu`,               0, `${DEST}/mm/mm_bombchu.png`],
  [`${MI}/Lens of Truth`,         0, `${DEST}/mm/mm_lens.png`],
  [`${MI}/Deku Stick`,            0, `${DEST}/mm/mm_stick.png`],
  [`${MI}/Deku Nut`,              0, `${DEST}/mm/mm_nut.png`],
  [`${MI}/Magic Beans`,           0, `${DEST}/mm/mm_bean.png`],
  [`${MI}/Ocarina`,               0, `${DEST}/mm/mm_ocarina.png`],
  [`${MI}/Kokiri Sword`,          0, `${DEST}/mm/mm_kokiri.png`],
  [`${MI}/Razor Sword`,           0, `${DEST}/mm/mm_razor.png`],
  [`${MI}/Gilded Sword`,          0, `${DEST}/mm/mm_gilded.png`],
  [`${MI}/Fierce Deity Sword`,    0, `${DEST}/mm/mm_fiercedeity.png`],
  [`${MI}/Great Fairy's Sword`,   0, `${DEST}/mm/mm_fairysword.png`],
  [`${MI}/Hero's Shield`,         0, `${DEST}/mm/mm_shield.png`],
  [`${MI}/Mirror Shield`,         0, `${DEST}/mm/mm_mirror.png`],
  [`${MI}/Powder Keg`,            0, `${DEST}/mm/mm_keg.png`],
  [`${MI}/Pictograph Box`,        0, `${DEST}/mm/mm_box.png`],
  [`${MI}/Letter to Kafei`,       0, `${DEST}/mm/mm_letter.png`],
  [`${MI}/Pendant of Memories`,   0, `${DEST}/mm/mm_pendant.png`],
  [`${MI}/Room Key`,              0, `${DEST}/mm/mm_roomkey.png`],
  [`${MI}/Moon's Tear`,           0, `${DEST}/mm/mm_tear.png`],
  [`${MI}/Wallets`,               0, `${DEST}/mm/mm_wallet.png`],
  [`${MI}/Wallets`,               1, `${DEST}/mm/mm_giantwallet.png`],
  [`${MI}/Wallets`,               0, `${DEST}/mm/mm_wallet99.png`],
  [`${MI}/Bottle Items`,          0, `${DEST}/mm/mm_bottle.png`],
  // Title Deeds (8 PNGs = 4 deeds × active/inactive pairs)
  [`${MI}/Title Deeds`,           0, `${DEST}/mm/mm_deed1.png`],
  [`${MI}/Title Deeds`,           2, `${DEST}/mm/mm_deed2.png`],
  [`${MI}/Title Deeds`,           4, `${DEST}/mm/mm_deed3.png`],
  [`${MI}/Title Deeds`,           6, `${DEST}/mm/mm_deed4.png`],

  // MM Masks
  [`${MK}/All-Night Mask`,        0, `${DEST}/mm/mm_allnight.png`],
  [`${MK}/Blast Mask`,            0, `${DEST}/mm/mm_blast.png`],
  [`${MK}/Bremen Mask`,           0, `${DEST}/mm/mm_bremen.png`],
  [`${MK}/Bunny Hood`,            0, `${DEST}/mm/mm_bunny.png`],
  [`${MK}/Captain's Hat`,         0, `${DEST}/mm/mm_captain.png`],
  [`${MK}/Couple's Mask`,         0, `${DEST}/mm/mm_couple.png`],
  [`${MK}/Deku Mask`,             0, `${DEST}/mm/mm_deku.png`],
  [`${MK}/Don Gero's Mask`,       0, `${DEST}/mm/mm_dongero.png`],
  [`${MK}/Garo's Mask`,           0, `${DEST}/mm/mm_garo.png`],
  [`${MK}/Giant's Mask`,          0, `${DEST}/mm/mm_giant.png`],
  [`${MK}/Gibdo Mask`,            0, `${DEST}/mm/mm_gibdo.png`],
  [`${MK}/Goron Mask`,            0, `${DEST}/mm/mm_goron.png`],
  [`${MK}/Great Fairy Mask`,      0, `${DEST}/mm/mm_greatfairy.png`],
  [`${MK}/Kafei's Mask`,          0, `${DEST}/mm/mm_kafeimask.png`],
  [`${MK}/Kamaro's Mask`,         0, `${DEST}/mm/mm_kamaro.png`],
  [`${MK}/Keaton Mask`,           0, `${DEST}/mm/mm_keaton.png`],
  [`${MK}/Mask of Truth`,         0, `${DEST}/mm/mm_maskoftruth.png`],
  [`${MK}/Romani's Mask`,         0, `${DEST}/mm/mm_romanimask.png`],
  [`${MK}/Mask of Scents`,        0, `${DEST}/mm/mm_scents.png`],
  [`${MK}/Stone Mask`,            0, `${DEST}/mm/mm_stone.png`],
  [`${MK}/Troupe Leader's Mask`,  0, `${DEST}/mm/mm_troupe.png`],
  [`${MK}/Zora Mask`,             0, `${DEST}/mm/mm_zora.png`],
  // Boss Remains
  [`${MK}/Odolwa's Remains`,      0, `${DEST}/mm/mm_odolwa.png`],
  [`${MK}/Goht's Remains`,        0, `${DEST}/mm/mm_goht.png`],
  [`${MK}/Gyorg's Remains`,       0, `${DEST}/mm/mm_gyorg.png`],
  [`${MK}/Twinmold's Remains`,    0, `${DEST}/mm/mm_twinmold.png`],
  // Fierce Deity Mask also lives in Masks folder
  [`${MK}/Fierce Deity Mask`,     0, `${DEST}/mask/mm_fiercedeity.png`],

  // OoT Items
  [`${SI}/Fairy Bow`,             0, `${DEST}/item/bow.png`],
  [`${SI}/Hookshot`,              0, `${DEST}/item/hookshot.png`],
  [`${SI}/Longshot`,              0, `${DEST}/item/longshot.png`],
  [`${SI}/Bombs`,                 0, `${DEST}/item/bomb.png`],
  [`${SI}/Bombchus`,              0, `${DEST}/item/bombchu.png`],
  [`${SI}/Boomerang`,             0, `${DEST}/item/boomerang.png`],
  [`${SI}/Fairy Slingshot`,       0, `${DEST}/item/slingshot.png`],
  [`${SI}/Deku Stick`,            0, `${DEST}/item/deku_stick.png`],
  [`${SI}/Deku Stick`,            0, `${DEST}/item/sticks_oot.png`],
  [`${SI}/Deku Stick`,            0, `${DEST}/item/stick.png`],
  [`${SI}/Deku Nut`,              0, `${DEST}/item/nut.png`],
  [`${SI}/Lens of Truth`,         0, `${DEST}/item/lens.png`],
  [`${SI}/Megaton Hammer`,        0, `${DEST}/item/hammer.png`],
  [`${SI}/Magic Beans`,           0, `${DEST}/item/bean.png`],
  [`${SI}/Ocarinas`,              1, `${DEST}/item/ocarina.png`],       // Ocarina of Time (blue, index 1)
  [`${SI}/Ocarinas`,              3, `${DEST}/item/fairyocarina.png`],  // Fairy Ocarina (green, index 3)
  [`${SI}/Magic Spells/Din's Fire`,    0, `${DEST}/item/din.png`],
  [`${SI}/Magic Spells/Farore's Wind`, 0, `${DEST}/item/farore.png`],
  [`${SI}/Magic Spells/Nayru's Love`,  0, `${DEST}/item/nayru.png`],

  // OoT Swords
  [`${EQ}/Kokiri Sword`,          0, `${DEST}/sword/sword1.png`],
  [`${EQ}/Master Sword`,          0, `${DEST}/sword/sword2.png`],
  [`${EQ}/Biggoron's Sword`,      0, `${DEST}/sword/sword3.png`],
  [`${EQ}/Biggoron's Sword`,      0, `${DEST}/sword/sword_biggoron.png`],
  [`${EQ}/Biggoron's Sword`,      1, `${DEST}/sword/giant_knife.png`],
  [`${SI}/Broken Goron's Sword`,  0, `${DEST}/sword/broken_sword.png`],

  // OoT Shields
  [`${EQ}/Deku Shield`,           0, `${DEST}/shield/shield1.png`],
  [`${EQ}/Deku Shield`,           0, `${DEST}/shield/deku_shield.png`],
  [`${EQ}/Hylian Shield`,         0, `${DEST}/shield/shield2.png`],
  [`${EQ}/Hylian Shield`,         0, `${DEST}/shield/hyrule_shield.png`],
  [`${EQ}/Mirror Shield`,         0, `${DEST}/shield/shield3.png`],

  // OoT Boots
  [`${EQ}/Kokiri Boots`,          0, `${DEST}/boots/boots.png`],
  [`${EQ}/Iron Boots`,            0, `${DEST}/boots/boots_iron.png`],
  [`${EQ}/Iron Boots`,            1, `${DEST}/boots/boots_iron2.png`],
  [`${EQ}/Hover Boots`,           0, `${DEST}/boots/boots_hover.png`],
  [`${EQ}/Hover Boots`,           1, `${DEST}/boots/boots_hover2.png`],

  // OoT Tunics
  [`${EQ}/Tunics/Zora Tunic`,     0, `${DEST}/tunic/bluetunic.png`],
  [`${EQ}/Tunics/Goron Tunic`,    0, `${DEST}/tunic/redtunic.png`],

  // OoT Upgrades
  [`${EQ}/Goron Bracelet`,        0, `${DEST}/upgrade/lift1.png`],
  [`${EQ}/Silver Gauntlets`,      0, `${DEST}/upgrade/lift2.png`],
  [`${EQ}/Golden Gauntlets`,      0, `${DEST}/upgrade/lift3.png`],
  [`${EQ}/Scales/Silver Scale`,   0, `${DEST}/upgrade/scale1.png`],
  [`${EQ}/Scales/Silver Scale`,   0, `${DEST}/upgrade/scale_bronze.png`],
  [`${EQ}/Scales/Golden Scale`,   0, `${DEST}/upgrade/scale2.png`],

  // OoT Masks
  [`${SI}/Bunny Hood`,            0, `${DEST}/mask/bunny.png`],
  [`${SI}/Gerudo Mask`,           0, `${DEST}/mask/gerudo.png`],
  [`${SI}/Keaton Mask`,           0, `${DEST}/mask/keaton.png`],
  [`${SI}/Spooky Mask`,           0, `${DEST}/mask/spooky.png`],
  [`${SI}/Mask of Truth`,         0, `${DEST}/mask/truth.png`],
];

console.log(`Copying ${tasks.length} images...\n`);
let ok = 0, miss = 0, err = 0;
for (const [srcDir, idx, dest] of tasks) {
  try {
    copy(srcDir, idx, dest);
    ok++;
  } catch (e) {
    console.error(`ERR ${dest} — ${e.message}`);
    err++;
  }
}
console.log(`\nDone: ${ok} copied, ${miss} missing source, ${err} errors`);
