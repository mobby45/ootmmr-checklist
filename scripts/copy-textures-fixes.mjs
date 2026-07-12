import { readdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const OOT = 'C:/Users/petit/Downloads/OOT_UI/HUD/Icons/Pause Screen';
const MM  = 'C:/Users/petit/Downloads/MM_UI';
const DEST = './public/images';

function copyByHash(dir, hash, destPath) {
  const pngs = readdirSync(dir).filter(f => f.endsWith('.png'));
  const f = pngs.find(p => p.includes(hash));
  if (!f) { console.warn(`HASH NOT FOUND: ${hash} in ${dir}`); return; }
  copyFileSync(join(dir, f), destPath);
  console.log(`OK  ${destPath.replace(DEST + '/', '')} ← ${f.substring(0, 40)}`);
}

const SI = `${OOT}/Select Item`;
const EQ = `${OOT}/Equipment`;
const MK = `${MM}/Masks`;
const MI = `${MM}/Items`;

// Fix 1: Biggoron's Sword (D17FC0BB = colored full-size Biggoron)
//         Giant Knife       (960CCD84 = colored cross-guard Giant Knife)
copyByHash(`${EQ}/Biggoron's Sword`, 'D17FC0BB', `${DEST}/sword/sword3.png`);
copyByHash(`${EQ}/Biggoron's Sword`, 'D17FC0BB', `${DEST}/sword/sword_biggoron.png`);
copyByHash(`${EQ}/Biggoron's Sword`, '960CCD84', `${DEST}/sword/giant_knife.png`);

// Fix 2: MM Wallets inverted — blue=wallet normal, gold=giant (swap per user)
copyByHash(`${MI}/Wallets`, 'F53379F9', `${DEST}/mm/mm_wallet.png`);
copyByHash(`${MI}/Wallets`, '71B7FAA7', `${DEST}/mm/mm_giantwallet.png`);
copyByHash(`${MI}/Wallets`, '71B7FAA7', `${DEST}/mm/mm_wallet99.png`);

// Fix 3: Fierce Deity mm/ → use Mask not Sword
copyByHash(`${MK}/Fierce Deity Mask`, 'D187DEC4', `${DEST}/mm/mm_fiercedeity.png`);

// Fix 4: MM bottle → empty (240DC43D)
copyByHash(`${MI}/Bottle Items`, '240DC43D', `${DEST}/mm/mm_bottle.png`);

// Fix 5: OoT bottles
copyByHash(`${SI}/Bottle Items`, '240DC43D', `${DEST}/bottle/bottle.png`);       // empty
copyByHash(`${SI}/Bottle Items`, '7373F99B', `${DEST}/bottle/bottle_letter.png`); // Ruto's Letter

console.log('\nDone.');
