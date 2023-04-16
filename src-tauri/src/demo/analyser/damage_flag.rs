use num_derive::{FromPrimitive, ToPrimitive};

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, PartialEq)]
#[allow(non_camel_case_types)]
pub enum DamageFlag {
    DMG_CRUSH,
    DMG_BULLET,
    DMG_SLASH,
    DMG_BURN,
    DMG_VEHICLE,
    DMG_FALL,
    DMG_BLAST,
    DMG_CLUB,
    DMG_SHOCK,
    DMG_SONIC,
    DMG_RADIUS_MAX,
    DMG_PREVENT_PHYSICS_FORCE,
    DMG_NEVERGIB,
    DMG_ALWAYSGIB,
    DMG_DROWN,
    DMG_PARALYZE,
    DMG_NERVEGAS,
    DMG_NOCLOSEDISTANCEMOD,
    DMG_HALF_FALLOFF,
    DMG_DROWNRECOVER,
    DMG_CRITICAL,
    DMG_USEDISTANCEMOD,
    DMG_REMOVENORAGDOLL,
    DMG_PHYSGUN,
    DMG_IGNITE,
    DMG_USE_HITLOCATIONS,
    DMG_DONT_COUNT_DAMAGE_TOWARDS_CRIT_RATE,
    DMG_MELEE,
    DMG_DIRECT,
    DMG_BUCKSHOT,
}

impl DamageFlag {
    pub const fn bitmask(&self) -> u32 {
        1 << (*self as u32)
    }
}
