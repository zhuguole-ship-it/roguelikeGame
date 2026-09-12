class_name FirstDungeonTerrainRuleContract
extends RefCounted

# This is the sole occupancy contract exported to Web.  Each operation stays
# in the unsigned 32-bit domain so TypeScript can reproduce it with Math.imul.
const ALGORITHM_ID := "first-dungeon-u32-mix-v1"
const ALGORITHM_VERSION := 1
const BIT_WIDTH := 32
const U32_MASK := 0xffffffff
const STONE_THRESHOLD := 161
const HASH_SEED_XOR := 0x9e3779b1
const HASH_X_MULTIPLIER := 0x9e3779b1
const HASH_Y_MULTIPLIER := 0x85ebca77
const HASH_MIX_ONE := 0x7feb352d
const HASH_MIX_TWO := 0x846ca68b
const MASK_NORTH := 1
const MASK_EAST := 2
const MASK_SOUTH := 4
const MASK_WEST := 8

static func u32(value: int) -> int:
	return value & U32_MASK

static func imul32(left: int, right: int) -> int:
	# ((aLo*bLo) + ((aHi*bLo + aLo*bHi) << 16)) mod 2^32.
	# The intermediate values remain below signed 64-bit range in GDScript.
	var normalized_left := u32(left)
	var normalized_right := u32(right)
	var left_low := normalized_left & 0xffff
	var left_high := normalized_left >> 16
	var right_low := normalized_right & 0xffff
	var right_high := normalized_right >> 16
	var low_product := left_low * right_low
	var cross_product := left_high * right_low + left_low * right_high
	return u32(low_product + ((cross_product & 0xffff) << 16))

static func hash_u32(battlefield_seed: int, global_cell_x: int, global_cell_y: int) -> int:
	var hash_value := u32(u32(battlefield_seed) ^ HASH_SEED_XOR ^ imul32(global_cell_x, HASH_X_MULTIPLIER) ^ imul32(global_cell_y, HASH_Y_MULTIPLIER))
	hash_value = imul32(u32(hash_value ^ (hash_value >> 16)), HASH_MIX_ONE)
	hash_value = imul32(u32(hash_value ^ (hash_value >> 15)), HASH_MIX_TWO)
	return u32(hash_value ^ (hash_value >> 16))

static func is_stone(battlefield_seed: int, global_cell_x: int, global_cell_y: int) -> bool:
	return (hash_u32(battlefield_seed, global_cell_x, global_cell_y) & 0xff) < STONE_THRESHOLD

static func mask_for_global_cell(battlefield_seed: int, global_cell_x: int, global_cell_y: int) -> int:
	if not is_stone(battlefield_seed, global_cell_x, global_cell_y):
		return 0
	var mask := 0
	if is_stone(battlefield_seed, global_cell_x, global_cell_y - 1):
		mask |= MASK_NORTH
	if is_stone(battlefield_seed, global_cell_x + 1, global_cell_y):
		mask |= MASK_EAST
	if is_stone(battlefield_seed, global_cell_x, global_cell_y + 1):
		mask |= MASK_SOUTH
	if is_stone(battlefield_seed, global_cell_x - 1, global_cell_y):
		mask |= MASK_WEST
	return mask

static func rule_spec() -> Dictionary:
	return {
		"algorithmId": ALGORITHM_ID,
		"algorithmVersion": ALGORITHM_VERSION,
		"bitWidth": BIT_WIDTH,
		"inputs": ["battlefieldSeed", "globalCellX", "globalCellY"],
		"coordinateSpace": "global-cell",
		"localChunkOffsetAllowed": false,
		"unsignedNormalization": "u32(value) = value & 0xffffffff",
		"imul32": "imul32(a,b) = ((aLo*bLo) + (((aHi*bLo + aLo*bHi) & 0xffff) << 16)) & 0xffffffff; aLo=a&0xffff; aHi=a>>>16; bLo=b&0xffff; bHi=b>>>16",
		"constants": {
			"seedXor": HASH_SEED_XOR,
			"xMultiplier": HASH_X_MULTIPLIER,
			"yMultiplier": HASH_Y_MULTIPLIER,
			"mixOneMultiplier": HASH_MIX_ONE,
			"mixTwoMultiplier": HASH_MIX_TWO,
			"stoneThresholdExclusive": STONE_THRESHOLD,
		},
		"steps": [
			"h = u32(u32(battlefieldSeed) ^ seedXor ^ imul32(globalCellX,xMultiplier) ^ imul32(globalCellY,yMultiplier))",
			"h = imul32(u32(h ^ (h >>> 16)), mixOneMultiplier)",
			"h = imul32(u32(h ^ (h >>> 15)), mixTwoMultiplier)",
			"h = u32(h ^ (h >>> 16))",
		],
		"stoneOutput": "(h & 255) < stoneThresholdExclusive",
		"mossOutput": "otherwise",
		"mask": {
			"onlyForStoneCells": true,
			"north": MASK_NORTH,
			"east": MASK_EAST,
			"south": MASK_SOUTH,
			"west": MASK_WEST,
			"neighbors": "Call isStone with global (x,y-1), (x+1,y), (x,y+1), (x-1,y); never clamp at a chunk boundary.",
		},
	}
