import struct

scenes = [x[0] for x in struct.iter_unpack('>H', open('OoTMM/packages/generator/data/static/xflag_table_oot_scenes.bin','rb').read())]
setups = [x[0] for x in struct.iter_unpack('>H', open('OoTMM/packages/generator/data/static/xflag_table_oot_setups.bin','rb').read())]
rooms  = [x[0] for x in struct.iter_unpack('>h', open('OoTMM/packages/generator/data/static/xflag_table_oot_rooms.bin','rb').read())]
bit_limit = 0x2fa * 8

def xfp(sid, raw):
    su = (raw >> 14) & 3
    rm = (raw >> 8) & 0x3F
    sl = raw >> 16
    lo = raw & 0xFF
    si = scenes[sid] + su
    ri = setups[si] + rm * 12 + sl
    bp = rooms[ri] + lo
    return bp if 0 <= bp < bit_limit else None

# Build scene map
sm = {}
with open('OoTMM/data/defs/scenes.yml') as f:
    for line in f:
        if ':' in line and line.strip() and (line.startswith('OOT_') or line.startswith('MM_')):
            n, _, v = line.strip().partition(':')
            sm[n.strip()] = int(v.strip(), 0)

# Link's House
lh = sm.get('OOT_LINK_HOUSE')
print('=== Link\'s House (scene 0x{:02x}) ==='.format(lh))
for raw in [0x0000, 0x0001, 0x0002, 0x0003, 0x0004]:
    bp = xfp(lh, raw)
    if bp is not None:
        print('  raw=0x{:04x} -> bit={} (byte={}.{})'.format(raw, bp, bp//8, bp%8))
    else:
        print('  raw=0x{:04x} -> OUT OF RANGE'.format(raw))

# Back Alley House
bah = sm.get('OOT_BACK_ALLEY_HOUSE')
print('\n=== Back Alley House (scene 0x{:02x}) ==='.format(bah))
for raw in [0x0002, 0x0003, 0x0004]:
    bp = xfp(bah, raw)
    if bp is not None:
        print('  raw=0x{:04x} -> bit={} (byte={}.{})'.format(raw, bp, bp//8, bp%8))

# Kokiri Forest
kf = sm.get('OOT_KOKIRI_FOREST')
print('\n=== Kokiri Forest (scene 0x{:02x}) ==='.format(kf))
for raw in range(0, 5):
    bp = xfp(kf, raw)
    if bp is not None:
        print('  raw=0x{:04x} -> bit={} (byte={}.{})'.format(raw, bp, bp//8, bp%8))

# All overworld scenes with their xflag ranges
print('\n=== All scenes with xflag ranges (first 5 raw_ids) ===')
for sid in range(101):
    bits = []
    for raw in range(0, 0x30):
        bp = xfp(sid, raw)
        if bp is not None:
            bits.append(bp)
    if bits:
        sname_list = [n for n, v in sm.items() if v == sid]
        sname = sname_list[0] if sname_list else '?'
        print('  scene {:3d} (0x{:02x}) {:30s}: bits {}-{}'.format(sid, sid, sname, bits[0], bits[-1]))
