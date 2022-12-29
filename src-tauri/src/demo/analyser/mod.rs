mod custom_damage;
mod damage_flag;
mod player_condition;
mod player_flag;
mod weapon_class;

use std::cmp::Reverse;
use std::{ convert::TryFrom, collections::HashMap };
use std::str::FromStr;

use serde::{ Deserialize, Serialize };
use num_derive::{ FromPrimitive };
use num_traits::{ FromPrimitive };

use steamid_ng::SteamID;
use tf_demo_parser::demo::header::Header;
use tf_demo_parser::{
    demo::{
        data::DemoTick,
        gameevent_gen::{
            CrossbowHealEvent,
            PlayerChargeDeployedEvent,
            PlayerConnectClientEvent,
            PlayerDeathEvent,
            PlayerDisconnectEvent,
            PlayerHealedEvent,
            PlayerHurtEvent,
            PlayerSpawnEvent,
            TeamPlayPointCapturedEvent,
            TeamPlayRoundStalemateEvent,
            TeamPlayRoundStartEvent,
            TeamPlayRoundWinEvent,
        },
        gamevent::GameEvent,
        message::{
            gameevent::GameEventMessage,
            packetentities::{ EntityId, PacketEntity },
            Message,
            usermessage::UserMessage,
        },
        packet::{
            datatable::{ ParseSendTable, ServerClass, ServerClassName },
            stringtable::StringTableEntry,
        },
        parser::{ analyser::{ Class, Team, UserId }, MessageHandler },
        sendprop::{
            SendProp,
            SendPropIdentifier,
        },
    },
    MessageType,
    ParserState,
    Stream,
};
pub use crate::demo::Scoreboard;

pub use custom_damage::CustomDamage;
pub use damage_flag::DamageFlag;
pub use player_condition::PlayerCondition;
pub use player_flag::PlayerFlag;
pub use weapon_class::WeaponClass;

#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize, PartialEq, FromPrimitive)]
pub enum PlayerLifeState {
    #[default]
    Alive = 0,
    Dying = 1,
    Death = 2,
    Respawnable = 3,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct HighlightEvent {
    tick: DemoTick,
    event: Highlight,
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(tag = "t", content = "c")]
pub enum Highlight {
    Kill {
        killer_id: UserId,
        assister_id: Option<UserId>,
        victim_id: UserId,
        weapon: String,
        kill_icon: String,
        streak: usize,
        drop: bool,
        airshot: bool,
    },
    ChatMessage {
        sender: UserId,
        text: String,
    },
    Airshot {
        attacker_id: UserId,
        victim_id: UserId,
    },
    CrossbowAirshot {
        healer_id: UserId,
        target_id: UserId,
    },
    PointCaptured {
        point_name: String,
        capturing_team: u8,
        cappers: Vec<UserId>,
    },
    RoundStalemate,
    RoundStart,
    RoundWin {
        winner: u8,
        // TODO: Win reason?
    },
    PlayerConnected {
        user_id: UserId,
    },
    PlayerDisconnected {
        user_id: UserId,
        reason: String,
    },
    Pause,
    Unpause,
    // TODO:
    // Multikill?
    // Midair kills?
    // Flicks?
}

#[derive(Default, Debug, Serialize)]
pub struct GameSummary {
    pub local_user_id: UserId,
    pub highlights: Vec<HighlightEvent>,
    pub red_team_score: u32,
    pub blue_team_score: u32,
    pub interval_per_tick: f32,
    pub players: Vec<PlayerSummary>,
}

#[derive(Debug, Default)]
pub struct PlayerState {
    name: String,
    steam_id: SteamID,
    user_id: UserId,

    team: Team,

    scoreboard: Scoreboard,

    // Temporary state data
    class: Class,
    life_state: PlayerLifeState,
    charge: u8,

    player_cond: u32,
    player_cond_ex: u32,
    player_cond_ex2: u32,
    player_cond_ex3: u32,

    // The same as `player_cond`.
    // For some reason, only TF_COND_CRITBOOSTED is stored
    // in this variable (bit 11), everything else is in player_cond.
    condition_bits: u32,

    time_on_class: [usize; 9],
}

#[allow(dead_code)]
impl PlayerState {
    pub fn has_cond(&self, cond: &PlayerCondition) -> bool {
        let cond = *cond as u32;
        if cond < 32 {
            // All conditions with index <32 are stored in `player_cond`,
            // except for TF_COND_CRITBOOSTED, which is stored in bit 11
            // of `condition_bits`.
            ((self.player_cond | self.condition_bits) & (1 << cond)) != 0
        } else if cond < 64 {
            (self.player_cond_ex & (1 << (cond - 32))) != 0
        } else if cond < 96 {
            (self.player_cond_ex2 & (1 << (cond - 64))) != 0
        } else if cond < 128 {
            (self.player_cond_ex3 & (1 << (cond - 96))) != 0
        } else {
            false
        }
    }

    fn format_conditions(&self) -> Vec<PlayerCondition> {
        let mut conditions = Vec::new();
        for i in 0..128u32 {
            if let Some(cond) = PlayerCondition::from_u32(i) {
                if self.has_cond(&cond) {
                    conditions.push(cond);
                }
            }
        }
        conditions
    }
}

#[derive(Debug, Default, Serialize)]
pub struct PlayerSummary {
    name: String,
    steam_id: SteamID,
    user_id: UserId,

    team: Team,
    classes: Vec<usize>,

    scoreboard: Scoreboard,
}

impl From<PlayerState> for PlayerSummary {
    fn from(state: PlayerState) -> Self {
        let PlayerState {
            name,
            steam_id,
            user_id,
            team,
            scoreboard,
            time_on_class,
            ..
        } = state;

        let mut classes: Vec<(usize, usize)> = time_on_class
            .into_iter()
            .enumerate()
            // Remove classes with no playtime
            .filter(|(_i, v)| *v != 0)
            .collect();
        // Sort by playtime, in descending order
        classes.sort_by_key(|a| Reverse(a.1));

        Self {
            name,
            steam_id,
            user_id,
            team,
            classes: classes
                .into_iter()
                .map(|(i, _v)| i)
                .collect(),
            scoreboard,
        }
    }
}

#[derive(Default, Debug)]
pub struct GameDetailsAnalyser {
    highlights: Vec<HighlightEvent>,
    interval_per_tick: f32,
    is_stv: bool,
    players: HashMap<UserId, PlayerState>,
    /// indexed by `ClassId`
    class_names: Vec<ServerClassName>,
    mediguns: HashMap<u32, EntityId>,
    red_team_entity_id: EntityId,
    blue_team_entity_id: EntityId,
    red_team_score: u32,
    blue_team_score: u32,
    local_entity_id: EntityId,

    player_entities: HashMap<EntityId, UserId>,
}

impl MessageHandler for GameDetailsAnalyser {
    type Output = GameSummary;

    fn does_handle(message_type: MessageType) -> bool {
        matches!(
            message_type,
            MessageType::PacketEntities |
                MessageType::GameEvent |
                MessageType::SetPause |
                MessageType::ServerInfo |
                MessageType::UserMessage
        )
    }

    fn handle_message(&mut self, message: &Message, tick: DemoTick, parser_state: &ParserState) {
        match message {
            Message::PacketEntities(message) => {
                for entity in &message.entities {
                    self.handle_entity(entity, tick, parser_state);
                }
            }
            Message::GameEvent(GameEventMessage { event, .. }) => {
                self.handle_game_event(event, tick);
            }
            Message::UserMessage(message) => {
                self.handle_usermessage(message, tick);
            }
            Message::SetPause(message) => {
                let event = if message.pause { Highlight::Pause } else { Highlight::Unpause };
                self.add_highlight(event, tick);
            }
            Message::ServerInfo(message) => {
                self.local_entity_id = EntityId::from((message.player_slot as u32) + 1);
                self.interval_per_tick = message.interval_per_tick;
            }
            _ => {}
        }
    }

    fn handle_string_entry(
        &mut self,
        table: &str,
        index: usize,
        entry: &StringTableEntry,
        _parser_state: &ParserState
    ) {
        if table == "userinfo" {
            self.parse_user_info(
                index,
                entry.text.as_ref().map(|s| s.as_ref()),
                entry.extra_data.as_ref().map(|data| data.data.clone())
            );
        }
    }

    fn handle_data_tables(
        &mut self,
        _parse_tables: &[ParseSendTable],
        server_classes: &[ServerClass],
        _parser_state: &ParserState
    ) {
        self.class_names = server_classes
            .iter()
            .map(|class| &class.name)
            .cloned()
            .collect();
    }

    fn handle_header(&mut self, header: &Header) {
        // STV demos have an empty server field in their header
        self.is_stv = header.server.is_empty();
    }

    fn into_output(self, _state: &ParserState) -> Self::Output {
        Self::Output {
            local_user_id: *self.player_entities
                .get(&self.local_entity_id)
                .unwrap_or(&UserId::default()),
            highlights: self.highlights,
            red_team_score: self.red_team_score,
            blue_team_score: self.blue_team_score,
            interval_per_tick: self.interval_per_tick,
            players: self.players.into_values().map(PlayerSummary::from).collect(),
        }
    }
}

/**
 * Helper function to make processing integer properties easier.
 *
 * parse_integer_prop(packet, "DT_TFPlayerScoringDataExclusive", "m_iPoints", |points| { println!("Scored {} points", points) });
 */
fn parse_integer_prop<F>(packet: &PacketEntity, table: &str, name: &str, parser_state: &ParserState, handler: F)
    where F: FnOnce(u32) {
    use tf_demo_parser::demo::sendprop::SendPropValue;

    match packet.get_prop_by_name(table, name, parser_state) {
        Some(prop) => {
            match prop.value {
                SendPropValue::Integer(val) => handler(val as u32),
                _ => {} // not an integer, ignore
            }
        },
        None => {} // the packet doesn't have this property
    }
}

impl GameDetailsAnalyser {
    fn add_highlight(&mut self, event: Highlight, tick: DemoTick) {
        self.highlights.push(HighlightEvent { tick, event })
    }

    // fn get_player_of_entity(&self, entity_id: &EntityId) -> Option<&PlayerState> {
    //     self.player_entities.get(entity_id).and_then(|user_id| self.players.get(user_id))
    // }

    fn get_player_of_entity_mut(&mut self, entity_id: &EntityId) -> Option<&mut PlayerState> {
        self.player_entities.get(entity_id).and_then(|user_id| self.players.get_mut(user_id))
    }

    pub fn handle_entity(
        &mut self,
        entity: &PacketEntity,
        tick: DemoTick,
        parser_state: &ParserState
    ) {
        let class_name: &str = self.class_names
            .get(usize::from(entity.server_class))
            .map(|class_name| class_name.as_str())
            .unwrap_or("");
        match class_name {
            "CTFPlayer" => self.handle_player_entity(entity, parser_state, tick),
            "CTFPlayerResource" => self.handle_player_resource(entity, parser_state),
            "CTFTeam" => self.handle_team(entity, parser_state),
            "CWeaponMedigun" => self.handle_medigun(entity, parser_state),

            _ => {}
        }
    }

    pub fn handle_game_event(&mut self, event: &GameEvent, tick: DemoTick) {
        match event {
            GameEvent::PlayerDeath(event) => {
                self.handle_player_death_event(event, tick);
            }
            GameEvent::PlayerHurt(event) => {
                self.handle_player_hurt_event(event, tick);
            }
            GameEvent::PlayerSpawn(event) => {
                self.handle_player_spawn_event(event, tick);
            }
            GameEvent::TeamPlayRoundStalemate(event) => {
                self.handle_round_stalemate_event(event, tick);
            }
            GameEvent::TeamPlayRoundStart(event) => {
                self.handle_round_start_event(event, tick);
            }
            GameEvent::TeamPlayRoundWin(event) => {
                self.handle_round_win_event(event, tick);
            }
            GameEvent::PlayerConnectClient(event) => {
                self.handle_player_connect_event(event, tick);
            }
            GameEvent::PlayerDisconnect(event) => {
                self.handle_player_disconnect_event(event, tick);
            }
            GameEvent::CrossbowHeal(event) => {
                self.handle_crossbow_heal_event(event, tick);
            }
            _ => {}
        }
    }

    fn handle_usermessage(&mut self, message: &UserMessage, tick: DemoTick) {
        if let UserMessage::SayText2(message) = message {
            self.add_highlight(
                Highlight::ChatMessage {
                    sender: *self.player_entities
                        .get(&EntityId::from(u32::from(message.client)))
                        .unwrap_or(&UserId::from(0u32)),
                    text: message.plain_text(),
                },
                tick
            );
        }
    }

    pub fn handle_player_resource(&mut self, entity: &PacketEntity, parser_state: &ParserState) {
        for prop in entity.props(parser_state) {
            if let Some((table_name, prop_name)) = prop.identifier.names() {
                if let Ok(entity_id) = u32::from_str(prop_name.as_str()) {
                    if let Some(player) = self.get_player_of_entity_mut(&EntityId::from(entity_id)) {
                        match table_name.as_str() {
                            "m_iTeam" => {
                                player.team = Team::new(
                                    i64::try_from(&prop.value).unwrap_or_default()
                                );
                            }
                            "m_iPlayerClass" => {
                                player.class = Class::new(
                                    i64::try_from(&prop.value).unwrap_or_default()
                                );
                            }
                            "m_iChargeLevel" => {
                                // This is only networked in tournament mode
                                // player.charge = i64
                                //     ::try_from(&prop.value)
                                //     .unwrap_or_default() as u8;
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    pub fn handle_player_entity(
        &mut self,
        entity: &PacketEntity,
        parser_state: &ParserState,
        tick: DemoTick
    ) {
        if let Some(player) = self.get_player_of_entity_mut(&entity.entity_index) {
            const LIFE_STATE_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_BasePlayer",
                "m_lifeState"
            );

            // Player conditions
            const PLAYER_COND_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerShared",
                "m_nPlayerCond"
            );
            const PLAYER_COND_EX_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerShared",
                "m_nPlayerCondEx"
            );
            const PLAYER_COND_EX2_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerShared",
                "m_nPlayerCondEx2"
            );
            const PLAYER_COND_EX3_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerShared",
                "m_nPlayerCondEx3"
            );
            const PLAYER_CONDITION_BITS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerConditionListExclusive",
                "_condition_bits"
            );

            // Player score
            const CAPTURES_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iCaptures"
            );
            const DEFENSES_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iDefenses"
            );
            const KILLS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iKills"
            );
            const DEATHS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iDeaths"
            );
            const DOMINATIONS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iDominations"
            );
            const REVENGE_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iRevenge"
            );
            const BUILDINGS_DESTROYED_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iBuildingsDestroyed"
            );
            const HEADSHOTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iCaptures"
            );
            const BACKSTABS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iBackstabs"
            );
            const HEAL_POINTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iHealPoints"
            );
            const INVULNS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iInvulns"
            );
            const TELEPORTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iTeleports"
            );
            const DAMAGE_DONE_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iDamageDone"
            );
            const KILL_ASSISTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iKillAssists"
            );
            const BONUS_POINTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iBonusPoints"
            );
            const POINTS_PROP: SendPropIdentifier = SendPropIdentifier::new(
                "DT_TFPlayerScoringDataExclusive",
                "m_iPoints"
            );

            for prop in entity.props(parser_state) {
                match prop.identifier {
                    LIFE_STATE_PROP => {
                        player.life_state = PlayerLifeState::from_i64(
                            i64::try_from(&prop.value).unwrap_or_default()
                        ).unwrap_or_default();
                    }
                    PLAYER_COND_PROP => {
                        player.player_cond = i64::try_from(&prop.value).unwrap_or_default() as u32;
                    }
                    PLAYER_COND_EX_PROP => {
                        player.player_cond_ex = i64
                            ::try_from(&prop.value)
                            .unwrap_or_default() as u32;
                    }
                    PLAYER_COND_EX2_PROP => {
                        player.player_cond_ex2 = i64
                            ::try_from(&prop.value)
                            .unwrap_or_default() as u32;
                    }
                    PLAYER_COND_EX3_PROP => {
                        player.player_cond_ex3 = i64
                            ::try_from(&prop.value)
                            .unwrap_or_default() as u32;
                    }
                    PLAYER_CONDITION_BITS_PROP => {
                        player.condition_bits = i64
                            ::try_from(&prop.value)
                            .unwrap_or_default() as u32;
                    }
                    CAPTURES_PROP => {
                        let captures = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if captures > player.scoreboard.captures {
                            player.scoreboard.captures = captures;
                        }
                    },
                    DEFENSES_PROP => {
                        let defenses = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if defenses > player.scoreboard.defenses {
                            player.scoreboard.defenses = defenses;
                        }
                    },
                    KILLS_PROP => {
                        let kills = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if kills > player.scoreboard.kills {
                            player.scoreboard.kills = kills;
                        }
                    },
                    DEATHS_PROP => {
                        let deaths = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if deaths > player.scoreboard.deaths {
                            player.scoreboard.deaths = deaths;
                        }
                    },
                    DOMINATIONS_PROP => {
                        let dominations = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if dominations > player.scoreboard.dominations {
                            player.scoreboard.dominations = dominations;
                        }
                    },
                    REVENGE_PROP => {
                        let revenges = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if revenges > player.scoreboard.revenges {
                            player.scoreboard.revenges = revenges;
                        }
                    },
                    BUILDINGS_DESTROYED_PROP => {
                        let buildings_destroyed = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if buildings_destroyed > player.scoreboard.buildings_destroyed {
                            player.scoreboard.buildings_destroyed = buildings_destroyed;
                        }
                    },
                    HEADSHOTS_PROP => {
                        let headshots = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if headshots > player.scoreboard.headshots {
                            player.scoreboard.headshots = headshots;
                        }
                    },
                    BACKSTABS_PROP => {
                        let backstabs = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if backstabs > player.scoreboard.backstabs {
                            player.scoreboard.backstabs = backstabs;
                        }
                    },
                    HEAL_POINTS_PROP => {
                        let healing = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if healing > player.scoreboard.healing {
                            player.scoreboard.healing = healing;
                        }
                    },
                    INVULNS_PROP => {
                        let ubercharges = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if ubercharges > player.scoreboard.ubercharges {
                            player.scoreboard.ubercharges = ubercharges;
                        }
                    },
                    TELEPORTS_PROP => {
                        let teleports = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if teleports > player.scoreboard.teleports {
                            player.scoreboard.teleports = teleports;
                        }
                    },
                    DAMAGE_DONE_PROP => {
                        let damage_dealt = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if damage_dealt > player.scoreboard.damage_dealt {
                            player.scoreboard.damage_dealt = damage_dealt;
                        }
                    },
                    KILL_ASSISTS_PROP => {
                        let assists = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if assists > player.scoreboard.assists {
                            player.scoreboard.assists = assists;
                        }
                    },
                    BONUS_POINTS_PROP => {
                        let bonus_points = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if bonus_points > player.scoreboard.bonus_points {
                            player.scoreboard.bonus_points = bonus_points;
                        }
                    },
                    POINTS_PROP => {
                        let points = i64::try_from(&prop.value).unwrap_or_default() as u32;

                        if points > player.scoreboard.points {
                            player.scoreboard.points = points;
                        }
                    },
                    _ => {}
                }
            }
        } else {
            eprintln!("player not known in handle_player_entity");
        }
    }

    fn handle_medigun(&mut self, entity: &PacketEntity, parser_state: &ParserState) {
        const CHARGE_PROP: SendPropIdentifier = SendPropIdentifier::new(
            "DT_TFWeaponMedigunDataNonLocal",
            "m_flChargeLevel"
        );
        const LOCAL_CHARGE_PROP: SendPropIdentifier = SendPropIdentifier::new(
            "DT_LocalTFWeaponMedigunData",
            "m_flChargeLevel"
        );
        const OWNER_PROP: SendPropIdentifier = SendPropIdentifier::new(
            "DT_BaseCombatWeapon",
            "m_hOwner"
        );

        for prop in entity.props(parser_state) {
            match prop.identifier {
                CHARGE_PROP | LOCAL_CHARGE_PROP => {
                    let charge = f32::try_from(&prop.value).unwrap_or_default();
                    if let Some(owner_id) = self.mediguns.get(&entity.entity_index.into()).copied() {
                        if let Some(owner) = self.get_player_of_entity_mut(&owner_id) {
                            owner.charge = (charge * 100.0).round() as u8;
                        }
                    }
                }
                OWNER_PROP => {
                    let owner_id = i64::try_from(&prop.value).unwrap_or_default() as u8 as u32;
                    if self.mediguns.get(&entity.entity_index.into()).is_none() {
                        self.mediguns.insert(entity.entity_index.into(), EntityId::from(owner_id));
                    }
                }
                _ => {}
            }
        }
    }

    fn handle_team(&mut self, entity: &PacketEntity, parser_state: &ParserState) {
        const TEAM_NUM_PROP: SendPropIdentifier = SendPropIdentifier::new("DT_Team", "m_iTeamNum");
        const TEAM_SCORE_PROP: SendPropIdentifier = SendPropIdentifier::new("DT_Team", "m_iScore");

        for prop in entity.props(parser_state) {
            match prop.identifier {
                TEAM_NUM_PROP => {
                    let team_num = i64::try_from(&prop.value).unwrap_or_default() as u8;

                    match Team::try_from(team_num).unwrap_or(Team::Other) {
                        Team::Red => {
                            self.red_team_entity_id = entity.entity_index;
                        }
                        Team::Blue => {
                            self.blue_team_entity_id = entity.entity_index;
                        }
                        _ => {}
                    }
                }
                TEAM_SCORE_PROP => {
                    let score = i64::try_from(&prop.value).unwrap_or_default() as u32;
                    if entity.entity_index == self.red_team_entity_id {
                        self.red_team_score = score;
                    } else if entity.entity_index == self.blue_team_entity_id {
                        self.blue_team_score = score;
                    }
                }
                _ => {}
            }
        }
    }

    fn parse_user_info(&mut self, index: usize, text: Option<&str>, data: Option<Stream>) {
        if
            let Ok(Some(user_info)) = tf_demo_parser::demo::data::UserInfo::parse_from_string_table(
                index as u16,
                text,
                data
            )
        {
            // Remember who this player entity belongs to.
            // If a player leaves and someone else joins,
            // the new player can get the EntityId previously
            // used by the player who left.
            self.player_entities.insert(user_info.entity_id, user_info.player_info.user_id);

            // Remember this user's name/steamID
            let mut player = self.players
                .entry(user_info.player_info.user_id)
                .or_insert_with(Default::default);

            player.name = user_info.player_info.name;
            player.steam_id = SteamID::from_steam3(
                &user_info.player_info.steam_id
            ).unwrap_or_default();
            player.user_id = user_info.player_info.user_id;
        }
    }

    fn handle_player_hurt_event(&mut self, event: &PlayerHurtEvent, tick: DemoTick) {
        let victim_id = UserId::from(event.user_id);
        let attacker_id = UserId::from(event.attacker);

        let victim = self.players.get(&victim_id).expect("failed to find victim");

        let weapon = WeaponClass::from_u16(event.weapon_id).unwrap_or_default();

        use WeaponClass::*;
        if
            // In POV demos, only record airshots performed by the local player.
            (self.is_stv ||
                self.player_entities.get(&self.local_entity_id) == Some(&attacker_id)) &&
            // Victim is currently blastjumping
            victim.has_cond(&PlayerCondition::TF_COND_BLASTJUMPING) &&
            victim_id != attacker_id &&
            // Only count hits with certain weapons
            matches!(
                weapon,
                TF_WEAPON_ROCKETLAUNCHER |
                    TF_WEAPON_ROCKETLAUNCHER_DIRECTHIT |
                    TF_WEAPON_PARTICLE_CANNON | // Cow mangler
                    TF_WEAPON_GRENADELAUNCHER |
                    TF_WEAPON_CANNON | // Loose cannon
                    TF_WEAPON_CROSSBOW
            )
        {
            self.add_highlight(Highlight::Airshot { attacker_id, victim_id }, tick);
        }
    }

    fn handle_player_death_event(&mut self, event: &PlayerDeathEvent, tick: DemoTick) {
        let killer_id = UserId::from(event.attacker);
        let maybe_assister_id = if (event.assister as i16) == -1 {
            None
        } else {
            Some(UserId::from(event.assister))
        };
        let victim_id = UserId::from(event.user_id);

        let victim = self.players.get(&victim_id);

        let drop: bool;
        let airshot: bool;

        if let Some(victim) = victim {
            drop = victim.charge == 100;
            airshot = victim.has_cond(&PlayerCondition::TF_COND_BLASTJUMPING);
        } else {
            drop = false;
            airshot = false;
        }

        let mut kill_icon = event.weapon.as_ref();

        // Substitute the kill icon according to the kill flags, if necessary.
        if let Some(custom_kill) = CustomDamage::from_u16(event.custom_kill) {
            use CustomDamage::*;
            match custom_kill {
                TF_DMG_CUSTOM_BACKSTAB => {
                    if kill_icon == "sharp_dresser" {
                        kill_icon = "sharp_dresser_backstab";
                    } else {
                        kill_icon = "backstab";
                    }
                }
                TF_DMG_CUSTOM_HEADSHOT | TF_DMG_CUSTOM_HEADSHOT_DECAPITATION => {
                    if kill_icon == "ambassador" {
                        kill_icon = "ambassador_headshot";
                    } else if kill_icon == "huntsman" {
                        kill_icon = "huntsman_headshot";
                    } else if event.player_penetrate_count > 0 {
                        kill_icon = "headshot_player_penetration";
                    } else {
                        kill_icon = "headshot";
                    }
                }
                TF_DMG_CUSTOM_BURNING => {
                    if killer_id == victim_id {
                        kill_icon = "firedeath";
                    }
                }
                TF_DMG_CUSTOM_BURNING_ARROW => {
                    kill_icon = "huntsman_burning";
                }
                TF_DMG_CUSTOM_FLYINGBURN => {
                    kill_icon = "huntsman_flyingburn";
                }
                TF_DMG_CUSTOM_PUMPKIN_BOMB => {
                    kill_icon = "pumpkindeath";
                }
                // This value is only given to custom_kill if
                // 1) The player uses a killbind to suicide or
                // 2) The player kills himself, with another
                //    player being awarded the kill because of
                //    recent damage.
                TF_DMG_CUSTOM_SUICIDE => {
                    if killer_id == victim_id {
                        kill_icon = "#suicide";
                    } else {
                        kill_icon = "#assisted_suicide";
                    }
                }
                TF_DMG_CUSTOM_EYEBALL_ROCKET => {
                    if killer_id == 0 {
                        // TODO
                        // Set the killer name to "MONOCULUS!"
                    }
                }
                | TF_DMG_CUSTOM_MERASMUS_ZAP
                | TF_DMG_CUSTOM_MERASMUS_GRENADE
                | TF_DMG_CUSTOM_MERASMUS_DECAPITATION => {
                    if killer_id == 0 {
                        // TODO
                        // Set the killer name to "MERASMUS!"
                    }
                }
                TF_DMG_CUSTOM_SPELL_SKELETON => {
                    if killer_id == 0 {
                        // TODO
                        // Set the killer name to "SKELETON"
                    }
                }
                TF_DMG_CUSTOM_KART => {
                    kill_icon = "bumper_kart";
                }
                TF_DMG_CUSTOM_GIANT_HAMMER => {
                    kill_icon = "necro_smasher";
                }
                _ => {}
            }
        }

        // Special cases of suicides
        if killer_id == 0 || killer_id == victim_id {
            if (event.damage_bits & DamageFlag::DMG_FALL.bitmask()) != 0 {
                kill_icon = "#fall";
            }
            // Don't ask.
            if (event.damage_bits & DamageFlag::DMG_NERVEGAS.bitmask()) != 0 {
                kill_icon = "saw_kill";
            }
            if (event.damage_bits & DamageFlag::DMG_VEHICLE.bitmask()) != 0 {
                kill_icon = "vehicle";
            }
        }

        self.add_highlight(
            Highlight::Kill {
                killer_id,
                assister_id: maybe_assister_id,
                victim_id,
                weapon: event.weapon.to_string(),
                kill_icon: kill_icon.to_string(),
                streak: event.kill_streak_total as usize,
                drop,
                airshot,
            },
            tick
        )
    }

    fn handle_crossbow_heal_event(&mut self, event: &CrossbowHealEvent, tick: DemoTick) {
        let target_id = UserId::from(event.target);
        let healer_id = UserId::from(event.healer);

        if let Some(target_player) = self.players.get(&target_id) {
            if target_player.has_cond(&PlayerCondition::TF_COND_BLASTJUMPING) {
                self.add_highlight(
                    Highlight::CrossbowAirshot {
                        healer_id,
                        target_id,
                    },
                    tick
                );
            }
        }
    }

    fn handle_player_spawn_event(&mut self, event: &PlayerSpawnEvent, _tick: DemoTick) {
        if let Some(player) = self.players.get_mut(&UserId::from(event.user_id)) {
            if (event.class as usize) > 0 {
                player.time_on_class[(event.class as usize) - 1] += 1; // TODO use time, not spawns
            }
        }
    }

    fn handle_round_stalemate_event(
        &mut self,
        _event: &TeamPlayRoundStalemateEvent,
        tick: DemoTick
    ) {
        self.add_highlight(Highlight::RoundStalemate, tick)
    }

    fn handle_round_start_event(&mut self, _event: &TeamPlayRoundStartEvent, tick: DemoTick) {
        self.add_highlight(Highlight::RoundStart, tick)
    }

    fn handle_round_win_event(&mut self, event: &TeamPlayRoundWinEvent, tick: DemoTick) {
        self.add_highlight(Highlight::RoundWin { winner: event.team }, tick)
    }

    fn handle_player_connect_event(&mut self, event: &PlayerConnectClientEvent, tick: DemoTick) {
        self.add_highlight(
            Highlight::PlayerConnected {
                user_id: UserId::from(event.user_id),
            },
            tick
        );
    }

    fn handle_player_disconnect_event(&mut self, event: &PlayerDisconnectEvent, tick: DemoTick) {
        self.add_highlight(
            Highlight::PlayerDisconnected {
                user_id: UserId::from(event.user_id),
                reason: event.reason.to_string(),
            },
            tick
        );
    }
}

#[test]
fn test_parser() {
    let default: String = "src/tests/data/demos/test_demo.dem".into();
    let args: Vec<String> = std::env::args().collect();
    let path = args
        .iter()
        .enumerate()
        .find(|(_index, arg)| *arg == "--path")
        .and_then(|item| args.get(item.0 + 1))
        .unwrap_or(&default);
    let file = std::fs::read(path).expect("Failed to read file");
    let demo = tf_demo_parser::Demo::new(&file);
    let parser = tf_demo_parser::DemoParser::new_all_with_analyser(
        demo.get_stream(),
        GameDetailsAnalyser::default()
    );
    let (header, state) = parser.parse().expect("Parsing failed");
    println!("HEADER: {header:#?}\nSTATE: {state:#?}");
}