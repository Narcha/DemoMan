use num_derive::{ FromPrimitive, ToPrimitive };

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive)]
#[allow(non_camel_case_types)]
pub enum PlayerFlag {
    FL_ONGROUND,
    FL_DUCKING,
    FL_ANIMDUCKING,
    FL_WATERJUMP,
    FL_ONTRAIN,
    FL_INRAIN,
    FL_FROZEN,
    FL_ATCONTROLS,
    FL_CLIENT,
    FL_FAKECLIENT,
    FL_INWATER,
    FL_FLY,
    FL_SWIM,
    FL_CONVEYOR,
    FL_NPC,
    FL_GODMODE,
    FL_NOTARGET,
    FL_AIMTARGET,
    FL_PARTIALGROUND,
    FL_STATICPROP,
    FL_GRAPHED,
    FL_GRENADE,
    FL_STEPMOVEMENT,
    FL_DONTTOUCH,
    FL_BASEVELOCITY,
    FL_WORLDBRUSH,
    FL_OBJECT,
    FL_KILLME,
    FL_ONFIRE,
    FL_DISSOLVING,
    FL_TRANSRAGDOLL,
    FL_UNBLOCKABLE_BY_PLAYER,
}

impl PlayerFlag {
    pub const fn bitmask(&self) -> u32 {
        1 << (*self as u32)
    }
}
